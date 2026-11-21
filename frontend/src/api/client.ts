import type {
  AuthResponse,
  DashboardStats,
  FamilyDetails,
  FamilyMember,
  FileItem,
  Folder,
  PublicShareInfo,
  SearchParams,
  ShareLink,
  StorageAccount,
  StorageConfig,
  TrashItem,
  User,
} from './types';

export function resolveApiBaseUrl(): string {
  const custom = typeof window !== 'undefined' ? localStorage.getItem('famdoc_api_base_url') : null;
  if (custom) return custom.trim().replace(/\/+$/, '');

  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) return envUrl.trim().replace(/\/+$/, '');

  if (typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname;
    // On production hosts (e.g. Vercel), connect directly to Railway backend
    if (
      host &&
      host !== 'localhost' &&
      host !== '127.0.0.1'
    ) {
      return 'https://famdoc-api-production-4260f70c.up.railway.app';
    }
  }
  return '';
}

export const API_BASE_URL = resolveApiBaseUrl();

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

function translateValidationError(field: string, message: string): string {
  const cleanMsg = message.replace(/^value error,\s*/i, '');
  if (cleanMsg.toLowerCase().startsWith(field.toLowerCase())) {
    return cleanMsg.charAt(0).toUpperCase() + cleanMsg.slice(1);
  }

  let friendlyField = field.charAt(0).toUpperCase() + field.slice(1);
  friendlyField = friendlyField.replace(/_/g, ' ');

  let friendlyMsg = cleanMsg;
  if (cleanMsg.includes("match pattern '^[a-zA-Z0-9_]+$'")) {
    friendlyMsg = 'should contain only letters, numbers, and underscores (no spaces or special characters).';
  } else if (cleanMsg.includes('match pattern')) {
    friendlyMsg = 'contains unsupported characters.';
  } else if (cleanMsg === 'Field required') {
    friendlyMsg = 'is required.';
  } else if (cleanMsg.includes('valid email address')) {
    friendlyMsg = 'must be a valid email address.';
  } else if (cleanMsg.includes('at least')) {
    const match = cleanMsg.match(/at least (\d+)/);
    friendlyMsg = match ? `must be at least ${match[1]} characters long.` : 'is too short.';
  } else if (cleanMsg.includes('at most')) {
    const match = cleanMsg.match(/at most (\d+)/);
    friendlyMsg = match ? `must be at most ${match[1]} characters long.` : 'is too long.';
  }

  return `${friendlyField} ${friendlyMsg}`;
}

async function performRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new ApiError('You appear to be offline. Please check your network connection.', 0);
  }

  const baseUrl = resolveApiBaseUrl();
  const url = `${baseUrl}${path}`;
  const headers = new Headers(options.headers || {});

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('famdoc_token') : null;
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      const isMockToken = token && token.startsWith('mock_e2e_');
      if (!isMockToken) {
        localStorage.removeItem('famdoc_token');
        localStorage.removeItem('famdoc_user');
        const hash = window.location.hash || '';
        const pathname = window.location.pathname || '';
        const isPublic =
          hash.includes('login') ||
          hash.includes('register') ||
          hash.includes('join') ||
          hash.includes('forgot-password') ||
          hash.includes('shared') ||
          pathname.includes('login') ||
          pathname.includes('register') ||
          pathname.includes('join') ||
          pathname.includes('forgot-password') ||
          pathname.includes('shared');

        if (!isPublic) {
          window.location.href = '#/login';
        }
      }
    }
    throw new ApiError('Session expired. Please log in again.', 401);
  }

  if (!response.ok) {
    let errorMsg = `Server error (${response.status})`;
    try {
      const errData = await response.json();
      if (typeof errData.detail === 'string') {
        errorMsg = errData.detail;
      } else if (Array.isArray(errData.detail) && errData.detail.length > 0) {
        const firstErr = errData.detail[0];
        const field = firstErr.loc ? firstErr.loc[firstErr.loc.length - 1] : 'field';
        errorMsg = translateValidationError(String(field), firstErr.msg || 'Invalid value');
      }
    } catch {
      // JSON parse failed, use fallback message
    }
    throw new ApiError(errorMsg, response.status);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  request: performRequest,

  auth: {
    async register(username: string, email: string, password: string): Promise<AuthResponse> {
      return performRequest<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
      });
    },

    async login(email: string, password: string): Promise<AuthResponse> {
      const data = await performRequest<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (data && data.access_token && typeof window !== 'undefined') {
        localStorage.setItem('famdoc_token', data.access_token);
        if (data.user) {
          localStorage.setItem('famdoc_user', JSON.stringify(data.user));
        }
      }
      return data;
    },

    async googleVerify(idToken: string, inviteCode?: string): Promise<AuthResponse> {
      const data = await performRequest<AuthResponse>('/api/auth/google/verify', {
        method: 'POST',
        body: JSON.stringify({
          id_token: idToken,
          invite_code: inviteCode,
        }),
      });
      if (data && data.access_token && typeof window !== 'undefined') {
        localStorage.setItem('famdoc_token', data.access_token);
        if (data.user) {
          localStorage.setItem('famdoc_user', JSON.stringify(data.user));
        }
      }
      return data;
    },

    async joinFamily(username: string, email: string, secretCode: string, password: string): Promise<AuthResponse> {
      const data = await performRequest<AuthResponse>('/api/auth/join', {
        method: 'POST',
        body: JSON.stringify({
          username,
          email,
          secret_code: secretCode,
          password,
        }),
      });
      if (data && data.access_token && typeof window !== 'undefined') {
        localStorage.setItem('famdoc_token', data.access_token);
        if (data.user) {
          localStorage.setItem('famdoc_user', JSON.stringify(data.user));
        }
      }
      return data;
    },

    async me(): Promise<User> {
      const user = await performRequest<User>('/api/auth/me');
      if (user && typeof window !== 'undefined') {
        localStorage.setItem('famdoc_user', JSON.stringify(user));
      }
      return user;
    },

    getUser(): User | null {
      if (typeof window === 'undefined') return null;
      const raw = localStorage.getItem('famdoc_user');
      try {
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    },

    async updateProfile(payload: { username?: string; password?: string; current_password?: string }): Promise<User> {
      return performRequest<User>('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },

    async logout(): Promise<void> {
      try {
        await performRequest('/api/auth/logout', { method: 'POST' });
      } catch {
        // Ignore network errors on logout
      } finally {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('famdoc_token');
          localStorage.removeItem('famdoc_user');
        }
      }
    },

    async requestPasswordReset(email: string): Promise<{ message: string }> {
      return performRequest('/api/auth/forgot-password/request', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    },

    async verifyResetOTP(email: string, otpCode: string): Promise<{ valid: boolean; token?: string }> {
      return performRequest('/api/auth/forgot-password/verify', {
        method: 'POST',
        body: JSON.stringify({ email, otp: otpCode }),
      });
    },

    async confirmPasswordReset(email: string, otpCode: string, newPassword: string): Promise<{ message: string }> {
      return performRequest('/api/auth/forgot-password/reset', {
        method: 'POST',
        body: JSON.stringify({ email, otp: otpCode, new_password: newPassword }),
      });
    },
  },

  family: {
    async setup(name: string, maxMembers = 10): Promise<FamilyDetails> {
      return performRequest<FamilyDetails>('/api/family/setup', {
        method: 'POST',
        body: JSON.stringify({ name, max_members: maxMembers }),
      });
    },

    async getMembers(): Promise<FamilyMember[]> {
      return performRequest<FamilyMember[]>('/api/family/members');
    },

    async removeMember(userId: number): Promise<{ message: string }> {
      return performRequest(`/api/family/members/${userId}`, {
        method: 'DELETE',
      });
    },

    async getDetails(): Promise<FamilyDetails> {
      return performRequest<FamilyDetails>('/api/family/details');
    },

    async regenerateCode(): Promise<{ secret_code: string }> {
      return performRequest<{ secret_code: string }>('/api/family/secret-code/regenerate', {
        method: 'POST',
      });
    },
  },

  storage: {
    async getConfig(): Promise<StorageConfig> {
      return performRequest<StorageConfig>('/api/storage/config');
    },

    async getAccounts(): Promise<StorageAccount[]> {
      return performRequest<StorageAccount[]>('/api/storage/accounts');
    },

    async getGoogleAuthUrl(clientId?: string, clientSecret?: string, action = 'connect'): Promise<{ url: string }> {
      return performRequest<{ url: string }>('/api/storage/google/auth-url', {
        method: 'POST',
        body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, action }),
      });
    },

    async updateAccount(accountId: number, payload: Partial<StorageAccount>): Promise<StorageAccount> {
      return performRequest<StorageAccount>(`/api/storage/accounts/${accountId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },

    async disconnectAccount(accountId: number): Promise<{ message: string }> {
      return performRequest(`/api/storage/accounts/${accountId}/disconnect`, {
        method: 'POST',
      });
    },

    async deleteAccount(accountId: number): Promise<{ message: string }> {
      return performRequest(`/api/storage/accounts/${accountId}`, {
        method: 'DELETE',
      });
    },

    async updateMode(storageProvider: string): Promise<StorageConfig> {
      return performRequest<StorageConfig>('/api/storage/mode', {
        method: 'PUT',
        body: JSON.stringify({ storage_provider: storageProvider }),
      });
    },
  },

  folders: {
    async getFolders(): Promise<Folder[]> {
      return performRequest<Folder[]>('/api/folders/');
    },

    async create(name: string, parentId: number | null = null): Promise<Folder> {
      return performRequest<Folder>('/api/folders/', {
        method: 'POST',
        body: JSON.stringify({ name, parent_id: parentId }),
      });
    },

    async rename(folderId: number, name: string): Promise<Folder> {
      return performRequest<Folder>(`/api/folders/${folderId}`, {
        method: 'PUT',
        body: JSON.stringify({ name }),
      });
    },

    async move(folderId: number, parentId: number | null): Promise<Folder> {
      return performRequest<Folder>(`/api/folders/${folderId}/move`, {
        method: 'PUT',
        body: JSON.stringify({ parent_id: parentId }),
      });
    },

    async delete(folderId: number): Promise<{ message: string }> {
      return performRequest(`/api/folders/${folderId}`, {
        method: 'DELETE',
      });
    },
  },

  files: {
    async getFiles(folderId: number | null = null): Promise<FileItem[]> {
      const q = folderId !== null ? `?folder_id=${folderId}` : '';
      return performRequest<FileItem[]>(`/api/files/${q}`);
    },

    async rename(fileId: number, filename: string): Promise<FileItem> {
      return performRequest<FileItem>(`/api/files/${fileId}`, {
        method: 'PUT',
        body: JSON.stringify({ filename }),
      });
    },

    async move(fileId: number, folderId: number | null): Promise<FileItem> {
      return performRequest<FileItem>(`/api/files/${fileId}/move`, {
        method: 'PUT',
        body: JSON.stringify({ folder_id: folderId }),
      });
    },

    async delete(fileId: number): Promise<{ message: string }> {
      return performRequest(`/api/files/${fileId}`, {
        method: 'DELETE',
      });
    },

    getDownloadUrl(fileId: number): string {
      const token = typeof window !== 'undefined' ? localStorage.getItem('famdoc_token') : null;
      const base = resolveApiBaseUrl();
      return `${base}/api/files/${fileId}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    },

    getPreviewUrl(fileId: number): string {
      const token = typeof window !== 'undefined' ? localStorage.getItem('famdoc_token') : null;
      const base = resolveApiBaseUrl();
      return `${base}/api/files/${fileId}/preview${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    },
  },

  trash: {
    async get(): Promise<TrashItem[]> {
      return performRequest<TrashItem[]>('/api/trash/');
    },

    async restore(itemType: 'file' | 'folder', itemId: number): Promise<{ message: string }> {
      return performRequest('/api/trash/restore', {
        method: 'POST',
        body: JSON.stringify({ item_type: itemType, item_id: itemId }),
      });
    },

    async purge(itemType: 'file' | 'folder', itemId: number): Promise<{ message: string }> {
      return performRequest('/api/trash/purge', {
        method: 'POST',
        body: JSON.stringify({ item_type: itemType, item_id: itemId }),
      });
    },
  },

  search: {
    async search(params: SearchParams = {}): Promise<FileItem[]> {
      const queryParams = new URLSearchParams();
      if (params.query) queryParams.set('q', params.query);
      if (params.category) queryParams.set('category', params.category);
      if (params.folder_id !== undefined && params.folder_id !== null) {
        queryParams.set('folder_id', String(params.folder_id));
      }
      return performRequest<FileItem[]>(`/api/search/?${queryParams.toString()}`);
    },
  },

  dashboard: {
    async getStats(): Promise<DashboardStats> {
      return performRequest<DashboardStats>('/api/dashboard/stats');
    },
  },

  sharing: {
    async createLink(
      fileId: number,
      password: string | null = null,
      expiresAt: string | null = null,
      maxDownloads: number | null = null
    ): Promise<ShareLink> {
      return performRequest<ShareLink>('/api/share/', {
        method: 'POST',
        body: JSON.stringify({
          file_id: fileId,
          password,
          expires_at: expiresAt,
          max_downloads: maxDownloads,
        }),
      });
    },

    async getLinks(fileId: number): Promise<ShareLink[]> {
      return performRequest<ShareLink[]>(`/api/share/file/${fileId}`);
    },

    async revokeLink(token: string): Promise<{ message: string }> {
      return performRequest(`/api/share/${token}`, {
        method: 'DELETE',
      });
    },

    async getPublicInfo(token: string): Promise<PublicShareInfo> {
      return performRequest<PublicShareInfo>(`/api/share/public/${token}`);
    },

    async downloadPublic(token: string, password: string | null = null): Promise<Blob> {
      const base = resolveApiBaseUrl();
      const url = `${base}/api/share/public/${token}/download`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        let msg = 'Failed to download shared file';
        try {
          const err = await response.json();
          if (err.detail) msg = err.detail;
        } catch {
          // ignore
        }
        throw new ApiError(msg, response.status);
      }
      return response.blob();
    },
  },

  helpers: {
    formatBytes(bytes: number, decimals = 1): string {
      if (!bytes || bytes === 0) return '0 B';
      const k = 1024;
      const dm = decimals < 0 ? 0 : decimals;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    },

    formatDate(dateStr?: string): string {
      if (!dateStr) return '—';
      try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      } catch {
        return dateStr;
      }
    },
  },
};
