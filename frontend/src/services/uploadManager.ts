import { openDB, type IDBPDatabase } from 'idb';
import { resolveApiBaseUrl } from '../api/client';

export interface UploadQueueItem {
  id: string;
  name: string;
  size: number;
  type: string;
  folderId?: number | null;
  file: File;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number;
  error?: string | null;
  addedAt: number;
}

const DB_NAME = 'FamDocUploadsDB';
const STORE_NAME = 'uploads';

let dbPromise: Promise<IDBPDatabase> | null = null;
function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

type Listener = (queue: UploadQueueItem[]) => void;
const listeners: Set<Listener> = new Set();

let isUploading = false;
let activeXhr: XMLHttpRequest | null = null;

export const uploadService = {
  subscribe(fn: Listener) {
    listeners.add(fn);
    this.getQueue().then(fn);
    return () => {
      listeners.delete(fn);
    };
  },

  async notify() {
    const queue = await this.getQueue();
    listeners.forEach((fn) => fn(queue));
  },

  async getQueue(): Promise<UploadQueueItem[]> {
    const db = await getDB();
    const list = await db.getAll(STORE_NAME);
    return list.sort((a, b) => a.addedAt - b.addedAt);
  },

  async addFiles(files: FileList | File[], folderId: number | null = null) {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    for (const file of Array.from(files)) {
      const item: UploadQueueItem = {
        id: 'up_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        folderId,
        file,
        status: 'pending',
        progress: 0,
        error: null,
        addedAt: Date.now(),
      };
      await tx.store.add(item);
    }
    await tx.done;
    await this.notify();
    this.processQueue();
  },

  async clearCompleted() {
    const db = await getDB();
    const queue = await this.getQueue();
    const finished = queue.filter((i) => i.status === 'completed' || i.status === 'failed');
    const tx = db.transaction(STORE_NAME, 'readwrite');
    for (const item of finished) {
      await tx.store.delete(item.id);
    }
    await tx.done;
    await this.notify();
  },

  async cancelUpload(id: string) {
    const db = await getDB();
    const item = await db.get(STORE_NAME, id);
    if (!item) return;

    if (item.status === 'uploading' && activeXhr) {
      activeXhr.abort();
      activeXhr = null;
    }
    await db.delete(STORE_NAME, id);
    await this.notify();
    isUploading = false;
    this.processQueue();
  },

  async processQueue() {
    if (isUploading) return;
    const queue = await this.getQueue();
    const pending = queue.find((i) => i.status === 'pending');
    if (!pending) return;

    isUploading = true;
    const db = await getDB();

    try {
      pending.status = 'uploading';
      await db.put(STORE_NAME, pending);
      await this.notify();

      await this.uploadItem(pending, async (percent) => {
        pending.progress = percent;
        await db.put(STORE_NAME, pending);
        await this.notify();
      });

      pending.status = 'completed';
      pending.progress = 100;
      await db.put(STORE_NAME, pending);
      await this.notify();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('famdoc:upload-completed', { detail: pending }));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      pending.status = 'failed';
      pending.error = message;
      await db.put(STORE_NAME, pending);
      await this.notify();
    } finally {
      isUploading = false;
      this.processQueue();
    }
  },

  async uploadItem(item: UploadQueueItem, onProgress: (pct: number) => void): Promise<unknown> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('famdoc_token') : null;
    const baseUrl = resolveApiBaseUrl();

    // Direct presigned Cloudflare R2 upload for files > 50MB
    if (item.file && item.file.size > 50 * 1024 * 1024) {
      const presignRes = await fetch(`${baseUrl}/api/files/upload-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          filename: item.name,
          content_type: item.type || 'application/octet-stream',
          size_bytes: item.file.size,
          folder_id: item.folderId !== null && item.folderId !== undefined ? item.folderId : null,
        }),
      });

      if (!presignRes.ok) {
        const errText = await presignRes.text();
        throw new Error(`Failed to initialize direct storage upload: ${errText}`);
      }

      const { upload_url, cloud_file_id } = await presignRes.json();

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        activeXhr = xhr;
        xhr.open('PUT', upload_url, true);
        xhr.setRequestHeader('Content-Type', item.type || 'application/octet-stream');

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        xhr.onload = () => {
          activeXhr = null;
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Storage PUT failed with status ${xhr.status}`));
        };

        xhr.onerror = () => {
          activeXhr = null;
          reject(new Error('Network error during storage upload.'));
        };

        xhr.onabort = () => {
          activeXhr = null;
          reject(new Error('Upload cancelled.'));
        };

        xhr.send(item.file);
      });

      const completeRes = await fetch(`${baseUrl}/api/files/upload-complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          filename: item.name,
          cloud_file_id,
          size_bytes: item.file.size,
          file_type: item.type || 'application/octet-stream',
          folder_id: item.folderId !== null && item.folderId !== undefined ? item.folderId : null,
        }),
      });

      if (!completeRes.ok) {
        throw new Error('Failed to record completed upload.');
      }
      return completeRes.json();
    }

    // Standard Multipart/form-data upload for files <= 50MB
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      activeXhr = xhr;
      const url = `${baseUrl}/api/files/upload`;
      xhr.open('POST', url, true);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        activeXhr = null;
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            resolve(xhr.responseText);
          }
        } else {
          let msg = `Upload failed (${xhr.status})`;
          if (xhr.status === 413) msg = 'File exceeds maximum upload size.';
          reject(new Error(msg));
        }
      };

      xhr.onerror = () => {
        activeXhr = null;
        reject(new Error('Network error during upload.'));
      };

      xhr.onabort = () => {
        activeXhr = null;
        reject(new Error('Upload cancelled.'));
      };

      const formData = new FormData();
      formData.append('file', item.file);
      if (item.folderId !== null && item.folderId !== undefined) {
        formData.append('folder_id', String(item.folderId));
      }
      xhr.send(formData);
    });
  },
};
