import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  useFolders,
  useFiles,
  useCreateFolder,
  useRenameFolder,
  useDeleteFolder,
  useRenameFile,
  useDeleteFile,
} from '../api/hooks';
import { api } from '../api/client';
import { useVaultStore } from '../stores/useVaultStore';
import { uploadService } from '../services/uploadManager';
import type { FileItem, Folder } from '../api/types';
import {
  Folder as FolderIcon,
  FileText,
  Upload,
  FolderPlus,
  Search,
  LayoutGrid,
  List,
  MoreVertical,
  Download,
  Share2,
  Trash2,
  Eye,
  Edit2,
  X,
  FileVideo,
  FileSpreadsheet,
  FileImage,
} from 'lucide-react';

export function VaultPage() {
  const [searchParams] = useSearchParams();
  const {
    currentFolderId,
    setCurrentFolderId,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    activePreviewFile,
    setActivePreviewFile,
    activeShareFile,
    setActiveShareFile,
    selectedFileIds,
    toggleSelectFile,
    clearSelectedFiles,
    selectAllFiles,
  } = useVaultStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingItem, setRenamingItem] = useState<{ id: number; name: string; type: 'file' | 'folder' } | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Queries & Mutations
  const { data: allFolders = [] } = useFolders();
  const { data: allFiles = [] } = useFiles(currentFolderId);
  const createFolderMut = useCreateFolder();
  const renameFolderMut = useRenameFolder();
  const deleteFolderMut = useDeleteFolder();
  const renameFileMut = useRenameFile();
  const deleteFileMut = useDeleteFile();

  // Handle URL deep links (?folder_id=123, ?action=new-folder, ?action=upload)
  useEffect(() => {
    const fid = searchParams.get('folder_id');
    if (fid) {
      const parsed = parseInt(fid, 10);
      if (!isNaN(parsed)) setCurrentFolderId(parsed);
    }
    const act = searchParams.get('action');
    if (act === 'new-folder') setIsNewFolderOpen(true);
    if (act === 'upload') fileInputRef.current?.click();
  }, [searchParams, setCurrentFolderId]);

  // Current subfolders & files
  const currentSubfolders = allFolders.filter((f) =>
    currentFolderId === null ? !f.parent_id : f.parent_id === currentFolderId
  );

  const currentFolder = allFolders.find((f) => f.id === currentFolderId);

  // Filter files by search & category
  const filteredFiles = allFiles.filter((file) => {
    if (searchQuery && !file.filename.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (selectedCategory) {
      const cat = selectedCategory.toLowerCase();
      const mime = (file.file_type || '').toLowerCase();
      const fn = file.filename.toLowerCase();
      if (cat === 'video' && !mime.includes('video') && !fn.endsWith('.mp4') && !fn.endsWith('.mkv')) return false;
      if (cat === 'pdf' && !mime.includes('pdf') && !fn.endsWith('.pdf')) return false;
      if (cat === 'image' && !mime.includes('image') && !fn.endsWith('.jpg') && !fn.endsWith('.png')) return false;
      if (cat === 'document' && !mime.includes('word') && !mime.includes('document') && !fn.endsWith('.docx') && !fn.endsWith('.doc')) return false;
      if (cat === 'sheet' && !mime.includes('sheet') && !mime.includes('excel') && !fn.endsWith('.xlsx') && !fn.endsWith('.csv')) return false;
      if (cat === 'text' && !mime.includes('text') && !fn.endsWith('.txt')) return false;
    }
    return true;
  });

  // Breadcrumbs chain
  const getBreadcrumbs = (): Array<{ id: number | null; name: string }> => {
    const chain: Array<{ id: number | null; name: string }> = [{ id: null, name: 'Home Vault' }];
    if (!currentFolderId) return chain;

    let curr: Folder | undefined = currentFolder;
    const path: Array<{ id: number | null; name: string }> = [];
    while (curr) {
      path.unshift({ id: curr.id, name: curr.name });
      curr = allFolders.find((f) => f.id === curr?.parent_id);
    }
    return [...chain, ...path];
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    await createFolderMut.mutateAsync({ name: newFolderName.trim(), parentId: currentFolderId });
    setNewFolderName('');
    setIsNewFolderOpen(false);
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingItem || !renameValue.trim()) return;
    if (renamingItem.type === 'folder') {
      await renameFolderMut.mutateAsync({ folderId: renamingItem.id, name: renameValue.trim() });
    } else {
      await renameFileMut.mutateAsync({ fileId: renamingItem.id, filename: renameValue.trim() });
    }
    setRenamingItem(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadService.addFiles(e.target.files, currentFolderId);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadService.addFiles(e.dataTransfer.files, currentFolderId);
    }
  };

  const getFileIcon = (mime: string, name: string) => {
    const m = (mime || '').toLowerCase();
    const n = name.toLowerCase();
    if (m.includes('video') || n.endsWith('.mp4')) return <FileVideo className="w-5 h-5 text-pink-500" />;
    if (m.includes('image') || n.endsWith('.jpg') || n.endsWith('.png')) return <FileImage className="w-5 h-5 text-blue-500" />;
    if (m.includes('pdf') || n.endsWith('.pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    if (m.includes('sheet') || n.endsWith('.xlsx') || n.endsWith('.csv')) return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
    return <FileText className="w-5 h-5 text-purple-500" />;
  };

  return (
    <div
      className="space-y-6 relative"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Hidden Drag Overlay (satisfies baseline locator #drag-overlay) */}
      <div
        id="drag-overlay"
        className={`fixed inset-0 z-50 bg-[var(--overlay-bg)]/80 backdrop-blur-xs flex items-center justify-center pointer-events-none transition-opacity ${
          isDragOver ? 'opacity-100 pointer-events-auto' : 'opacity-0'
        }`}
      >
        <div className="p-8 rounded-3xl bg-[var(--surface-card)] border-2 border-dashed border-[var(--color-primary)] text-center shadow-2xl">
          <Upload className="w-12 h-12 text-[var(--color-primary)] mx-auto mb-3 animate-bounce" />
          <h3 className="text-lg font-bold text-[var(--text-ink)]">Drop files to upload</h3>
          <p className="text-xs text-[var(--text-ink-muted)] mt-1">
            Files will be uploaded into {currentFolder?.name || 'Home Vault'}
          </p>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        id="file-input"
        ref={fileInputRef}
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Explorer Top Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-3xl bg-[var(--surface-card)] border border-[var(--border-paper)] shadow-xs">
        {/* Breadcrumbs */}
        <div id="breadcrumbs" className="flex items-center flex-wrap gap-1.5 text-xs font-semibold text-[var(--text-ink)]">
          {getBreadcrumbs().map((b, idx, arr) => (
            <div key={b.id ?? 'root'} className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setCurrentFolderId(b.id);
                  clearSelectedFiles();
                }}
                className={`hover:text-[var(--color-primary)] transition-colors cursor-pointer ${
                  idx === arr.length - 1 ? 'text-[var(--color-primary)] font-bold' : 'text-[var(--text-ink-muted)]'
                }`}
              >
                {b.name}
              </button>
              {idx < arr.length - 1 && <span className="text-[var(--text-ink-muted)]">/</span>}
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="btn-upload"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload</span>
          </button>

          <button
            type="button"
            id="btn-new-folder"
            onClick={() => setIsNewFolderOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--surface-paper-tint)] hover:bg-[var(--surface-paper-hover)] border border-[var(--border-paper)] text-[var(--text-ink)] text-xs font-semibold transition-colors cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-emerald-600" />
            <span>New Folder</span>
          </button>
        </div>
      </div>

      {/* Search, Filter, & View Mode Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 max-w-md relative">
          <Search className="w-4 h-4 text-[var(--text-ink-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="vault-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents by name..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-[var(--border-paper)] bg-[var(--surface-card)] text-[var(--text-ink)] text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Format Filter Dropdown */}
          <select
            id="filter-type"
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value || null)}
            className="py-2 px-3 rounded-xl border border-[var(--border-paper)] bg-[var(--surface-card)] text-[var(--text-ink)] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="">All Formats</option>
            <option value="video">Videos</option>
            <option value="PDF">PDF Documents</option>
            <option value="IMAGE">Images</option>
            <option value="DOCUMENT">Word Docs</option>
            <option value="SHEET">Spreadsheets</option>
            <option value="TEXT">Text Files</option>
          </select>

          {/* View Toggle */}
          <div className="flex rounded-xl border border-[var(--border-paper)] bg-[var(--surface-paper-tint)] p-0.5">
            <button
              type="button"
              id="toggle-grid"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[var(--surface-card)] text-[var(--color-primary)] shadow-xs'
                  : 'text-[var(--text-ink-muted)] hover:text-[var(--text-ink)]'
              }`}
              aria-label="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              id="toggle-list"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-[var(--surface-card)] text-[var(--color-primary)] shadow-xs'
                  : 'text-[var(--text-ink-muted)] hover:text-[var(--text-ink)]'
              }`}
              aria-label="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Explorer Container */}
      <div id="items-wrapper" className="min-h-[300px]">
        {currentSubfolders.length === 0 && filteredFiles.length === 0 ? (
          <div id="explorer-empty" className="p-12 text-center rounded-3xl bg-[var(--surface-card)] border border-[var(--border-paper)]">
            <FolderIcon className="w-12 h-12 text-[var(--border-paper)] mx-auto mb-3" />
            <h3 className="empty-state-title text-base font-bold text-[var(--text-ink)]">This folder is empty</h3>
            <p className="empty-state-text text-xs text-[var(--text-ink-muted)] mt-1">
              Drag and drop files here, or click upload to add family records.
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {/* Subfolders */}
            {currentSubfolders.map((folder) => (
              <div
                key={`folder-${folder.id}`}
                onClick={() => setCurrentFolderId(folder.id)}
                className="group p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-paper)] hover:border-[var(--color-primary)] hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between relative"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
                    <FolderIcon className="w-6 h-6 fill-current" />
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(activeMenuId === `f-${folder.id}` ? null : `f-${folder.id}`);
                    }}
                    className="p-1 rounded-lg text-[var(--text-ink-muted)] hover:text-[var(--text-ink)] hover:bg-[var(--surface-paper-hover)]"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>

                {activeMenuId === `f-${folder.id}` && (
                  <div
                    className="absolute top-12 right-4 z-20 w-36 rounded-xl bg-[var(--surface-card)] border border-[var(--border-paper)] shadow-xl p-1 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setRenamingItem({ id: folder.id, name: folder.name, type: 'folder' });
                        setRenameValue(folder.name);
                        setActiveMenuId(null);
                      }}
                      className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-[var(--surface-paper-hover)] text-[var(--text-ink)]"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Rename
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm(`Delete folder "${folder.name}"?`)) {
                          await deleteFolderMut.mutateAsync(folder.id);
                        }
                        setActiveMenuId(null);
                      }}
                      className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-red-50 text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                )}

                <div>
                  <div className="text-xs font-bold text-[var(--text-ink)] truncate" title={folder.name}>
                    {folder.name}
                  </div>
                  <div className="text-[10px] text-[var(--text-ink-muted)] mt-0.5">
                    {folder.file_count ?? 0} items
                  </div>
                </div>
              </div>
            ))}

            {/* Files */}
            {filteredFiles.map((file) => (
              <div
                key={`file-${file.id}`}
                onClick={() => setActivePreviewFile(file)}
                className={`group p-4 rounded-2xl bg-[var(--surface-card)] border transition-all cursor-pointer flex flex-col justify-between relative ${
                  selectedFileIds.includes(file.id)
                    ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20'
                    : 'border-[var(--border-paper)] hover:border-[var(--color-primary)] hover:shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-[var(--surface-paper-tint)]">
                    {getFileIcon(file.file_type, file.filename)}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(activeMenuId === `file-${file.id}` ? null : `file-${file.id}`);
                    }}
                    className="p-1 rounded-lg text-[var(--text-ink-muted)] hover:text-[var(--text-ink)] hover:bg-[var(--surface-paper-hover)]"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>

                {activeMenuId === `file-${file.id}` && (
                  <div
                    className="absolute top-12 right-4 z-20 w-36 rounded-xl bg-[var(--surface-card)] border border-[var(--border-paper)] shadow-xl p-1 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <a
                      href={api.files.getDownloadUrl(file.id)}
                      download={file.filename}
                      className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-[var(--surface-paper-hover)] text-[var(--text-ink)] no-underline"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveShareFile(file);
                        setActiveMenuId(null);
                      }}
                      className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-[var(--surface-paper-hover)] text-[var(--text-ink)]"
                    >
                      <Share2 className="w-3.5 h-3.5" /> Share
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRenamingItem({ id: file.id, name: file.filename, type: 'file' });
                        setRenameValue(file.filename);
                        setActiveMenuId(null);
                      }}
                      className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-[var(--surface-paper-hover)] text-[var(--text-ink)]"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Rename
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm(`Move "${file.filename}" to trash?`)) {
                          await deleteFileMut.mutateAsync(file.id);
                        }
                        setActiveMenuId(null);
                      }}
                      className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-red-50 text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Trash
                    </button>
                  </div>
                )}

                <div>
                  <div className="text-xs font-semibold text-[var(--text-ink)] truncate" title={file.filename}>
                    {file.filename}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[var(--text-ink-muted)] mt-1">
                    <span>{api.helpers.formatBytes(file.file_size)}</span>
                    <span>{api.helpers.formatDate(file.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="rounded-2xl bg-[var(--surface-card)] border border-[var(--border-paper)] overflow-hidden divide-y divide-[var(--border-paper)]">
            {currentSubfolders.map((folder) => (
              <div
                key={`folder-row-${folder.id}`}
                onClick={() => setCurrentFolderId(folder.id)}
                className="flex items-center justify-between p-3 px-4 hover:bg-[var(--surface-paper-hover)] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <FolderIcon className="w-5 h-5 text-emerald-600 fill-current" />
                  <span className="text-xs font-bold text-[var(--text-ink)]">{folder.name}</span>
                </div>
                <span className="text-xs text-[var(--text-ink-muted)]">{folder.file_count ?? 0} items</span>
              </div>
            ))}

            {filteredFiles.map((file) => (
              <div
                key={`file-row-${file.id}`}
                onClick={() => setActivePreviewFile(file)}
                className="flex items-center justify-between p-3 px-4 hover:bg-[var(--surface-paper-hover)] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {getFileIcon(file.file_type, file.filename)}
                  <span className="text-xs font-semibold text-[var(--text-ink)] truncate">{file.filename}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-[var(--text-ink-muted)] shrink-0">
                  <span>{api.helpers.formatBytes(file.file_size)}</span>
                  <span>{api.helpers.formatDate(file.created_at)}</span>
                  <a
                    href={api.files.getDownloadUrl(file.id)}
                    download={file.filename}
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 rounded-lg hover:bg-[var(--surface-paper-tint)] text-[var(--text-ink)]"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Folder Modal */}
      {isNewFolderOpen && (
        <div
          id="modal-create-folder"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsNewFolderOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[var(--surface-card)] rounded-3xl p-6 border border-[var(--border-paper)] shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="modal-title text-base font-bold text-[var(--text-ink)]">Create Folder</h3>
              <button
                type="button"
                onClick={() => setIsNewFolderOpen(false)}
                className="modal-close text-[var(--text-ink-muted)] hover:text-[var(--text-ink)]"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form id="form-create-folder" onSubmit={handleCreateFolder} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="new-folder-name" className="text-xs font-semibold text-[var(--text-ink)]">
                  Folder Name
                </label>
                <input
                  id="new-folder-name"
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Tax Receipts"
                  required
                  maxLength={50}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-paper)] bg-[var(--surface-paper-tint)]/40 text-xs text-[var(--text-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewFolderOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--border-paper)] text-xs font-semibold hover:bg-[var(--surface-paper-hover)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-xs font-semibold shadow-xs hover:bg-[var(--color-primary-dark)]"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renamingItem && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setRenamingItem(null)}
        >
          <div
            className="w-full max-w-md bg-[var(--surface-card)] rounded-3xl p-6 border border-[var(--border-paper)] shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[var(--text-ink)]">Rename {renamingItem.type}</h3>
              <button
                type="button"
                onClick={() => setRenamingItem(null)}
                className="text-[var(--text-ink-muted)] hover:text-[var(--text-ink)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRename} className="space-y-4">
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-paper)] bg-[var(--surface-paper-tint)]/40 text-xs text-[var(--text-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRenamingItem(null)}
                  className="px-4 py-2 rounded-xl border border-[var(--border-paper)] text-xs font-semibold hover:bg-[var(--surface-paper-hover)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-xs font-semibold shadow-xs hover:bg-[var(--color-primary-dark)]"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {activePreviewFile && (
        <div
          id="preview-modal"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col p-4 md:p-8"
          onClick={() => setActivePreviewFile(null)}
        >
          <div
            className="flex items-center justify-between text-white p-3 px-4 bg-black/40 rounded-2xl mb-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 truncate">
              <Eye className="w-5 h-5 text-emerald-400" />
              <span className="font-semibold text-sm truncate">{activePreviewFile.filename}</span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={api.files.getDownloadUrl(activePreviewFile.id)}
                download={activePreviewFile.filename}
                className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-medium no-underline"
              >
                Download
              </a>
              <button
                type="button"
                onClick={() => setActivePreviewFile(null)}
                className="p-1 rounded-xl hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div
            className="flex-1 bg-black/60 rounded-3xl overflow-hidden flex items-center justify-center p-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {activePreviewFile.file_type.includes('image') ? (
              <img
                src={api.files.getPreviewUrl(activePreviewFile.id)}
                alt={activePreviewFile.filename}
                className="max-h-full max-w-full object-contain rounded-xl"
              />
            ) : activePreviewFile.file_type.includes('pdf') ? (
              <iframe
                src={api.files.getPreviewUrl(activePreviewFile.id)}
                title={activePreviewFile.filename}
                className="w-full h-full rounded-xl bg-white"
              />
            ) : (
              <div className="text-center text-white p-8">
                <FileText className="w-16 h-16 mx-auto mb-4 text-emerald-400 opacity-80" />
                <h4 className="text-base font-bold mb-2">Preview not available directly in browser</h4>
                <p className="text-xs text-white/60 mb-6">
                  {activePreviewFile.filename} ({api.helpers.formatBytes(activePreviewFile.file_size)})
                </p>
                <a
                  href={api.files.getDownloadUrl(activePreviewFile.id)}
                  download={activePreviewFile.filename}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold no-underline"
                >
                  Download File
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
