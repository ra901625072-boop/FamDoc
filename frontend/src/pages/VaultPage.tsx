import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  useFolders,
  useFiles,
  useCreateFolder,
  useRenameFolder,
  useMoveFolder,
  useDeleteFolder,
  useRenameFile,
  useMoveFile,
  useDeleteFile,
} from '../api/hooks';
import { api } from '../api/client';
import { useVaultStore } from '../stores/useVaultStore';
import { uploadService } from '../services/uploadManager';
import type { FileItem, Folder } from '../api/types';
import {
  modalBackdropVariants,
  modalDialogVariants,
  dropdownVariants,
  staggerContainerVariants,
  staggerItemVariants,
  emptyStateFloatVariants,
  springs,
} from '../lib/motion';

export function VaultPage() {
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [selectedFolderIds, setSelectedFolderIds] = useState<number[]>([]);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingItem, setRenamingItem] = useState<{ id: number; name: string; type: 'file' | 'folder' } | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [movingItem, setMovingItem] = useState<{ id: number; name: string; type: 'file' | 'folder' } | null>(null);
  const [destinationFolderId, setDestinationFolderId] = useState<number | null>(null);
  const [isBulkMoveOpen, setIsBulkMoveOpen] = useState(false);
  const [bulkDestinationFolderId, setBulkDestinationFolderId] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [mobileFabOpen, setMobileFabOpen] = useState(false);

  // Queries & Mutations
  const { data: allFolders = [], refetch: refetchFolders } = useFolders();
  const { data: allFiles = [], refetch: refetchFiles } = useFiles(currentFolderId);
  const createFolderMut = useCreateFolder();
  const renameFolderMut = useRenameFolder();
  const moveFolderMut = useMoveFolder();
  const deleteFolderMut = useDeleteFolder();
  const renameFileMut = useRenameFile();
  const moveFileMut = useMoveFile();
  const deleteFileMut = useDeleteFile();

  // Close active menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.dropdown-menu') && !target.closest('.item-actions-trigger')) {
        setActiveMenuId(null);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Handle URL deep links (?folder_id=123, ?action=new-folder, ?action=upload, ?preview=123)
  useEffect(() => {
    const fid = searchParams.get('folder_id');
    if (fid) {
      const parsed = parseInt(fid, 10);
      if (!isNaN(parsed)) setCurrentFolderId(parsed);
    }
    const act = searchParams.get('action');
    if (act === 'new-folder') setIsNewFolderOpen(true);
    if (act === 'upload') fileInputRef.current?.click();

    const prevId = searchParams.get('preview');
    if (prevId && allFiles.length > 0) {
      const target = allFiles.find((f) => f.id === Number(prevId));
      if (target) setActivePreviewFile(target);
    }
  }, [searchParams, setCurrentFolderId, allFiles, setActivePreviewFile]);

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
      if (cat === 'video' && !mime.includes('video') && !/\.(mp4|mkv|webm|mov|avi|flv|wmv|m4v)$/i.test(fn)) return false;
      if (cat === 'pdf' && !mime.includes('pdf') && !/\.pdf$/i.test(fn)) return false;
      if (cat === 'image' && !mime.includes('image') && !/\.(jpg|jpeg|png|webp|gif|bmp|svg|tiff|ico)$/i.test(fn)) return false;
      if (cat === 'document' && !mime.includes('word') && !mime.includes('document') && !/\.(docx|doc|odt|rtf)$/i.test(fn)) return false;
      if (cat === 'sheet' && !mime.includes('sheet') && !mime.includes('excel') && !/\.(xlsx|xls|csv)$/i.test(fn)) return false;
      if (cat === 'text' && !mime.includes('text') && !/\.txt$/i.test(fn)) return false;
    }
    return true;
  });

  // Breadcrumbs chain
  const [previewZoom, setPreviewZoom] = useState(1);
  useEffect(() => {
    setPreviewZoom(1);
  }, [activePreviewFile?.id]);

  const activeFileIndex = activePreviewFile ? filteredFiles.findIndex((f) => f.id === activePreviewFile.id) : -1;
  const hasPrevFile = activeFileIndex > 0;
  const hasNextFile = activeFileIndex >= 0 && activeFileIndex < filteredFiles.length - 1;

  const handlePrevFile = () => {
    if (hasPrevFile) setActivePreviewFile(filteredFiles[activeFileIndex - 1]);
  };

  const handleNextFile = () => {
    if (hasNextFile) setActivePreviewFile(filteredFiles[activeFileIndex + 1]);
  };

  useEffect(() => {
    if (!activePreviewFile) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActivePreviewFile(null);
      } else if (e.key === 'ArrowLeft' && hasPrevFile) {
        handlePrevFile();
      } else if (e.key === 'ArrowRight' && hasNextFile) {
        handleNextFile();
      } else if (e.key === '+' || e.key === '=') {
        setPreviewZoom((z) => Math.min(3, z + 0.25));
      } else if (e.key === '-') {
        setPreviewZoom((z) => Math.max(0.5, z - 0.25));
      } else if (e.key === '0') {
        setPreviewZoom(1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePreviewFile, hasPrevFile, hasNextFile, activeFileIndex]);

  const getBreadcrumbs = (): Array<{ id: number | null; name: string }> => {
    const chain: Array<{ id: number | null; name: string }> = [{ id: null, name: 'Root Vault' }];
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
    try {
      await createFolderMut.mutateAsync({ name: newFolderName.trim(), parentId: currentFolderId });
      setNewFolderName('');
      setIsNewFolderOpen(false);
      refetchFolders();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to create folder.');
    }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingItem || !renameValue.trim()) return;
    try {
      if (renamingItem.type === 'folder') {
        await renameFolderMut.mutateAsync({ folderId: renamingItem.id, name: renameValue.trim() });
      } else {
        await renameFileMut.mutateAsync({ fileId: renamingItem.id, filename: renameValue.trim() });
      }
      setRenamingItem(null);
      refetchFolders();
      refetchFiles();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to rename item.');
    }
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

  useEffect(() => {
    const handleUploadCompleted = () => {
      refetchFiles();
      refetchFolders();
    };
    window.addEventListener('famdoc:upload-completed', handleUploadCompleted);
    return () => window.removeEventListener('famdoc:upload-completed', handleUploadCompleted);
  }, [refetchFiles, refetchFolders]);

  const handleMoveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movingItem) return;
    try {
      if (movingItem.type === 'folder') {
        await moveFolderMut.mutateAsync({ folderId: movingItem.id, parentId: destinationFolderId });
      } else {
        await moveFileMut.mutateAsync({ fileId: movingItem.id, folderId: destinationFolderId });
      }
      setMovingItem(null);
      refetchFolders();
      refetchFiles();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to move item.');
    }
  };

  const handleBulkMoveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      for (const folderId of selectedFolderIds) {
        await moveFolderMut.mutateAsync({ folderId, parentId: bulkDestinationFolderId });
      }
      for (const fileId of selectedFileIds) {
        await moveFileMut.mutateAsync({ fileId, folderId: bulkDestinationFolderId });
      }
      handleClearSelection();
      setIsBulkMoveOpen(false);
      refetchFolders();
      refetchFiles();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to move selected items.');
    }
  };

  const toggleSelectFolder = (folderId: number) => {
    setSelectedFolderIds((prev) =>
      prev.includes(folderId) ? prev.filter((id) => id !== folderId) : [...prev, folderId]
    );
  };

  const totalSelectableCount = currentSubfolders.length + filteredFiles.length;
  const totalSelectedCount = selectedFolderIds.length + selectedFileIds.length;
  const isAllSelected = totalSelectableCount > 0 && totalSelectedCount === totalSelectableCount;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedFolderIds([]);
      clearSelectedFiles();
    } else {
      setSelectedFolderIds(currentSubfolders.map((f) => f.id));
      selectAllFiles(filteredFiles.map((f) => f.id));
    }
  };

  const handleClearSelection = () => {
    setSelectedFolderIds([]);
    clearSelectedFiles();
  };

  const handleBulkDelete = async () => {
    const total = selectedFolderIds.length + selectedFileIds.length;
    if (!confirm(`Move ${total} selected item${total > 1 ? 's' : ''} to trash?`)) return;

    for (const folderId of selectedFolderIds) {
      await deleteFolderMut.mutateAsync(folderId);
    }
    for (const fileId of selectedFileIds) {
      await deleteFileMut.mutateAsync(fileId);
    }
    handleClearSelection();
  };

  return (
    <div
      className="fd-fade-in relative min-h-screen"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Authentic Content Header */}
      <div className="content-header fd-fade-in">
        <div>
          <h1 className="page-title">Shared Vault</h1>
          <p className="page-subtitle">Your family's secure document archive.</p>
        </div>
        <div className="toolbar-actions">
          <input
            type="file"
            id="file-picker"
            ref={fileInputRef}
            multiple
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
          <button
            className="btn btn-secondary"
            id="btn-new-folder"
            type="button"
            onClick={() => setIsNewFolderOpen(true)}
          >
            <i className="fas fa-folder-plus" aria-hidden="true" />
            <span>New Folder</span>
          </button>
          <button
            className="btn btn-primary"
            id="btn-upload-file"
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            <i className="fas fa-cloud-upload-alt" aria-hidden="true" />
            <span>Upload File</span>
          </button>
        </div>
      </div>

      {/* Drag & Drop Overlay Indicator */}
      <AnimatePresence>
        {isDragOver && (
          <motion.div
            id="drag-overlay"
            className="show"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={springs.snappy}
          >
            <i className="fas fa-cloud-upload-alt" style={{ fontSize: '4rem' }} aria-hidden="true" />
            <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 800 }}>Drop Files Anywhere to Upload</h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
              Uploading to {currentFolder?.name || 'Root Vault'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Browser Surface */}
      <div id="explorer-container" className="explorer-container">
        {/* Browser Toolbar with Breadcrumbs, Search, Filter, View Toggles */}
        <div className="browser-toolbar fd-fade-in">
          {/* Breadcrumbs */}
          <div className="browser-breadcrumbs" id="breadcrumbs">
            {getBreadcrumbs().map((b, idx, arr) =>
              idx === arr.length - 1 ? (
                <span key={b.id ?? 'root'} className="breadcrumb-current">
                  {b.name}
                </span>
              ) : (
                <span key={b.id ?? 'root'} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                  <a
                    href={`#/vault${b.id ? `?folder_id=${b.id}` : ''}`}
                    className="breadcrumb-link"
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentFolderId(b.id);
                      handleClearSelection();
                    }}
                  >
                    {b.name}
                  </a>
                  <span className="breadcrumb-separator">
                    <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem' }} aria-hidden="true" />
                  </span>
                </span>
              )
            )}
          </div>

          {/* Right Toolbar Controls */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div className="search-input-wrapper">
              <i className="fas fa-search" aria-hidden="true" />
              <input
                type="text"
                id="vault-search"
                className="form-control"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ padding: '0.5rem 1rem 0.5rem 2.25rem', fontSize: '0.85rem', width: '180px' }}
              />
            </div>

            {/* Filter Category Select */}
            <select
              id="filter-type"
              className="form-control"
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value || null)}
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', width: 'auto', height: 'auto' }}
            >
              <option value="">All Formats</option>
              <option value="video">Videos</option>
              <option value="pdf">PDF Documents</option>
              <option value="image">Images</option>
              <option value="document">Word Docs</option>
              <option value="sheet">Spreadsheets</option>
              <option value="text">Text Files</option>
            </select>

            {/* View Mode Toggle */}
            <div
              style={{
                display: 'flex',
                border: '1px solid var(--border-paper)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                backgroundColor: 'var(--surface-paper-tint)',
              }}
            >
              <button
                type="button"
                className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                id="toggle-grid"
                style={{ border: 'none', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                aria-label="Grid View"
                onClick={() => setViewMode('grid')}
              >
                <i className="fas fa-th-large" aria-hidden="true" />
              </button>
              <button
                type="button"
                className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                id="toggle-list"
                style={{ border: 'none', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                aria-label="List View"
                onClick={() => setViewMode('list')}
              >
                <i className="fas fa-list" aria-hidden="true" />
              </button>
            </div>

            {/* Select All Checkbox */}
            <label
              className="fd-select-checkbox-container"
              style={{ marginLeft: '0.5rem', marginRight: 0 }}
              title="Select all items in folder"
            >
              <input
                type="checkbox"
                id="select-all-checkbox"
                checked={isAllSelected}
                onChange={handleToggleSelectAll}
              />
              <span className="fd-select-checkmark" />
            </label>
          </div>
        </div>

        {/* Items Container: Grid or List */}
        <div
          id="items-wrapper"
          className={viewMode === 'grid' ? 'items-grid' : 'items-list'}
          style={{ display: viewMode === 'grid' ? 'grid' : 'flex', width: '100%', minHeight: '350px' }}
        >
          {/* Empty State when no folders or files */}
          {currentSubfolders.length === 0 && filteredFiles.length === 0 ? (
            <div
              id="explorer-empty"
              className="empty-state fd-fade-in"
              style={{ display: 'flex', gridColumn: '1 / -1', width: '100%', minHeight: '350px' }}
            >
              <motion.div variants={emptyStateFloatVariants} animate="animate">
                <i className="fas fa-folder-open empty-state-icon" aria-hidden="true" />
              </motion.div>
              <h3 className="empty-state-title">This folder is empty</h3>
              <p className="empty-state-text">Drag and drop files here, or click upload to add family records.</p>
            </div>
          ) : (
            <>
              {/* 1. Subfolders */}
              {currentSubfolders.map((folder, index) => {
              const isSelected = selectedFolderIds.includes(folder.id);
              const isMenuOpen = activeMenuId === `folder-${folder.id}`;

              if (viewMode === 'list') {
                return (
                  <div
                    key={`folder-${folder.id}`}
                    className={`vault-item fd-fade-up fd-stagger ${isSelected ? 'selected' : ''}`}
                    style={{ '--fd-delay': `${Math.min(index * 0.05, 0.5)}s` } as React.CSSProperties}
                    onClick={() => {
                      setCurrentFolderId(folder.id);
                      handleClearSelection();
                    }}
                  >
                    <label
                      className="fd-select-checkbox-container"
                      style={{ marginLeft: '0.5rem', marginRight: 0 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        className="item-select-checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectFolder(folder.id)}
                      />
                      <span className="fd-select-checkmark" />
                    </label>

                    <i className="item-icon folder fas fa-folder" aria-hidden="true" />

                    <div className="item-details">
                      <div className="item-name" title={folder.name}>
                        {folder.name}
                      </div>
                      <div className="item-meta-size">{folder.file_count ?? 0} files</div>
                      <div className="item-meta-date">
                        {api.helpers.formatDate(folder.last_modified).split(',')[0]}
                      </div>
                      <div className="item-meta-uploader">—</div>
                    </div>

                    <button
                      type="button"
                      className="item-actions-trigger"
                      data-action="toggle-dropdown"
                      aria-label="Actions Menu"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(isMenuOpen ? null : `folder-${folder.id}`);
                      }}
                    >
                      <i className="fas fa-ellipsis-v" aria-hidden="true" />
                    </button>

                    <div className={`dropdown-menu ${isMenuOpen ? 'show' : ''}`} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="dropdown-item"
                        onClick={() => {
                          setRenamingItem({ id: folder.id, name: folder.name, type: 'folder' });
                          setRenameValue(folder.name);
                          setActiveMenuId(null);
                        }}
                      >
                        <i className="fas fa-edit" aria-hidden="true" /> Rename
                      </button>
                      <button
                        type="button"
                        className="dropdown-item"
                        onClick={() => {
                          setMovingItem({ id: folder.id, name: folder.name, type: 'folder' });
                          setDestinationFolderId(null);
                          setActiveMenuId(null);
                        }}
                      >
                        <i className="fas fa-arrows-alt" aria-hidden="true" /> Move
                      </button>
                      <button
                        type="button"
                        className="dropdown-item danger"
                        onClick={async () => {
                          if (confirm(`Delete folder "${folder.name}"?`)) {
                            await deleteFolderMut.mutateAsync(folder.id);
                          }
                          setActiveMenuId(null);
                        }}
                      >
                        <i className="fas fa-trash-alt" aria-hidden="true" /> Delete
                      </button>
                    </div>
                  </div>
                );
              }

              {/* Grid View for Folders */}
              return (
                <div
                  key={`folder-${folder.id}`}
                  className={`vault-item fd-fade-up fd-stagger ${isSelected ? 'selected' : ''}`}
                  style={{ '--fd-delay': `${Math.min(index * 0.05, 0.5)}s` } as React.CSSProperties}
                  onClick={() => {
                    setCurrentFolderId(folder.id);
                    handleClearSelection();
                  }}
                >
                  <label
                    className="fd-select-checkbox-container"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      className="item-select-checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectFolder(folder.id)}
                    />
                    <span className="fd-select-checkmark" />
                  </label>

                  <div className="item-preview-area">
                    <i className="item-icon folder fas fa-folder" aria-hidden="true" />
                  </div>

                  <div className="item-footer">
                    <div className="item-details">
                      <div className="item-name" title={folder.name}>
                        {folder.name}
                      </div>
                      <div className="item-meta">{folder.file_count ?? 0} files</div>
                    </div>

                    <button
                      type="button"
                      className="item-actions-trigger"
                      data-action="toggle-dropdown"
                      aria-label="Actions Menu"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(isMenuOpen ? null : `folder-${folder.id}`);
                      }}
                    >
                      <i className="fas fa-ellipsis-v" aria-hidden="true" />
                    </button>

                    <div className={`dropdown-menu ${isMenuOpen ? 'show' : ''}`} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="dropdown-item"
                        onClick={() => {
                          setRenamingItem({ id: folder.id, name: folder.name, type: 'folder' });
                          setRenameValue(folder.name);
                          setActiveMenuId(null);
                        }}
                      >
                        <i className="fas fa-edit" aria-hidden="true" /> Rename
                      </button>
                      <button
                        type="button"
                        className="dropdown-item"
                        onClick={() => {
                          setMovingItem({ id: folder.id, name: folder.name, type: 'folder' });
                          setDestinationFolderId(null);
                          setActiveMenuId(null);
                        }}
                      >
                        <i className="fas fa-arrows-alt" aria-hidden="true" /> Move
                      </button>
                      <button
                        type="button"
                        className="dropdown-item danger"
                        onClick={async () => {
                          if (confirm(`Delete folder "${folder.name}"?`)) {
                            await deleteFolderMut.mutateAsync(folder.id);
                          }
                          setActiveMenuId(null);
                        }}
                      >
                        <i className="fas fa-trash-alt" aria-hidden="true" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* 2. Files */}
            {filteredFiles.map((file, index) => {
              const isSelected = selectedFileIds.includes(file.id);
              const isMenuOpen = activeMenuId === `file-${file.id}`;
              const iconClass = api.helpers.getFileIconClass(file.filename, file.file_type);

              if (viewMode === 'list') {
                return (
                  <div
                    key={`file-${file.id}`}
                    className={`vault-item fd-fade-up fd-stagger ${isSelected ? 'selected' : ''}`}
                    style={{ '--fd-delay': `${Math.min((currentSubfolders.length + index) * 0.05, 0.5)}s` } as React.CSSProperties}
                    onClick={() => setActivePreviewFile(file)}
                  >
                    <label
                      className="fd-select-checkbox-container"
                      style={{ marginLeft: '0.5rem', marginRight: 0 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        className="item-select-checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectFile(file.id)}
                      />
                      <span className="fd-select-checkmark" />
                    </label>

                    <div className="thumbnail-wrapper">
                      <i className={`item-icon ${iconClass} thumbnail-fallback`} aria-hidden="true" />
                      {(file.file_type?.toLowerCase().startsWith('image/') ||
                        /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.filename) ||
                        file.file_type === 'application/pdf' ||
                        file.filename.toLowerCase().endsWith('.pdf')) && (
                        <img
                          className="item-icon item-thumbnail"
                          src={api.files.getPreviewUrl(file.id, file.preview_token, true)}
                          alt={file.filename}
                          loading="lazy"
                          onLoad={(e) => {
                            (e.currentTarget as HTMLElement).classList.add('loaded');
                            const fallback = e.currentTarget.parentElement?.querySelector('.thumbnail-fallback') as HTMLElement | null;
                            if (fallback) fallback.style.opacity = '0';
                          }}
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                            const fallback = e.currentTarget.parentElement?.querySelector('.thumbnail-fallback') as HTMLElement | null;
                            if (fallback) fallback.style.opacity = '1';
                          }}
                        />
                      )}
                    </div>

                    <div className="item-details">
                      <div className="item-name" title={file.filename} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.filename}</span>
                        <span className="file-format-pill">{api.helpers.getFileFormatLabel(file.filename, file.file_type)}</span>
                      </div>
                      <div className="item-meta-size">{api.helpers.formatBytes(file.file_size ?? file.size_bytes ?? 0)}</div>
                      <div className="item-meta-date">
                        {api.helpers.formatDate(file.created_at ?? file.upload_date).split(',')[0]}
                      </div>
                      <div className="item-meta-uploader">—</div>
                    </div>

                    <button
                      type="button"
                      className="item-actions-trigger"
                      data-action="toggle-dropdown"
                      aria-label="Actions Menu"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(isMenuOpen ? null : `file-${file.id}`);
                      }}
                    >
                      <i className="fas fa-ellipsis-v" aria-hidden="true" />
                    </button>

                    <div className={`dropdown-menu ${isMenuOpen ? 'show' : ''}`} onClick={(e) => e.stopPropagation()}>
                      <a
                        href={api.files.getDownloadUrl(file.id, file.preview_token)}
                        download={api.helpers.ensureFilenameWithExtension(file.filename, file.file_type)}
                        className="dropdown-item"
                        style={{ textDecoration: 'none' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <i className="fas fa-download" aria-hidden="true" /> Download
                      </a>
                      <button
                        type="button"
                        className="dropdown-item"
                        onClick={() => {
                          setActiveShareFile(file);
                          setActiveMenuId(null);
                        }}
                      >
                        <i className="fas fa-share-alt" aria-hidden="true" /> Share
                      </button>
                      <button
                        type="button"
                        className="dropdown-item"
                        onClick={() => {
                          setRenamingItem({ id: file.id, name: file.filename, type: 'file' });
                          setRenameValue(file.filename);
                          setActiveMenuId(null);
                        }}
                      >
                        <i className="fas fa-edit" aria-hidden="true" /> Rename
                      </button>
                      <button
                        type="button"
                        className="dropdown-item"
                        onClick={() => {
                          setMovingItem({ id: file.id, name: file.filename, type: 'file' });
                          setDestinationFolderId(currentFolderId);
                          setActiveMenuId(null);
                        }}
                      >
                        <i className="fas fa-arrows-alt" aria-hidden="true" /> Move
                      </button>
                      <button
                        type="button"
                        className="dropdown-item danger"
                        onClick={async () => {
                          if (confirm(`Move "${file.filename}" to trash?`)) {
                            await deleteFileMut.mutateAsync(file.id);
                          }
                          setActiveMenuId(null);
                        }}
                      >
                        <i className="fas fa-trash-alt" aria-hidden="true" /> Trash
                      </button>
                    </div>
                  </div>
                );
              }

              {/* Grid View for Files */}
              return (
                <div
                  key={`file-${file.id}`}
                  className={`vault-item fd-fade-up fd-stagger ${isSelected ? 'selected' : ''}`}
                  style={{ '--fd-delay': `${Math.min((currentSubfolders.length + index) * 0.05, 0.5)}s` } as React.CSSProperties}
                  onClick={() => setActivePreviewFile(file)}
                >
                  <label
                    className="fd-select-checkbox-container"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      className="item-select-checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectFile(file.id)}
                    />
                    <span className="fd-select-checkmark" />
                  </label>

                  <div className="item-preview-area">
                    <div className="thumbnail-wrapper">
                      <i className={`item-icon ${iconClass} thumbnail-fallback`} aria-hidden="true" />
                      {(file.file_type?.toLowerCase().startsWith('image/') ||
                        /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.filename) ||
                        file.file_type === 'application/pdf' ||
                        file.filename.toLowerCase().endsWith('.pdf')) && (
                        <img
                          className="item-icon item-thumbnail"
                          src={api.files.getPreviewUrl(file.id, file.preview_token, true)}
                          alt={file.filename}
                          loading="lazy"
                          onLoad={(e) => {
                            (e.currentTarget as HTMLElement).classList.add('loaded');
                            const fallback = e.currentTarget.parentElement?.querySelector('.thumbnail-fallback') as HTMLElement | null;
                            if (fallback) fallback.style.opacity = '0';
                          }}
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                            const fallback = e.currentTarget.parentElement?.querySelector('.thumbnail-fallback') as HTMLElement | null;
                            if (fallback) fallback.style.opacity = '1';
                          }}
                        />
                      )}
                    </div>
                  </div>

                  <div className="item-footer">
                    <div className="item-details">
                      <div className="item-name" title={file.filename} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.filename}</span>
                        <span className="file-format-pill">{api.helpers.getFileFormatLabel(file.filename, file.file_type)}</span>
                      </div>
                      <div className="item-meta">{api.helpers.formatBytes(file.file_size ?? file.size_bytes ?? 0)}</div>
                    </div>

                    <button
                      type="button"
                      className="item-actions-trigger"
                      data-action="toggle-dropdown"
                      aria-label="Actions Menu"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(isMenuOpen ? null : `file-${file.id}`);
                      }}
                    >
                      <i className="fas fa-ellipsis-v" aria-hidden="true" />
                    </button>

                    <div className={`dropdown-menu ${isMenuOpen ? 'show' : ''}`} onClick={(e) => e.stopPropagation()}>
                      <a
                        href={api.files.getDownloadUrl(file.id, file.preview_token)}
                        download={api.helpers.ensureFilenameWithExtension(file.filename, file.file_type)}
                        className="dropdown-item"
                        style={{ textDecoration: 'none' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <i className="fas fa-download" aria-hidden="true" /> Download
                      </a>
                      <button
                        type="button"
                        className="dropdown-item"
                        onClick={() => {
                          setActiveShareFile(file);
                          setActiveMenuId(null);
                        }}
                      >
                        <i className="fas fa-share-alt" aria-hidden="true" /> Share
                      </button>
                      <button
                        type="button"
                        className="dropdown-item"
                        onClick={() => {
                          setRenamingItem({ id: file.id, name: file.filename, type: 'file' });
                          setRenameValue(file.filename);
                          setActiveMenuId(null);
                        }}
                      >
                        <i className="fas fa-edit" aria-hidden="true" /> Rename
                      </button>
                      <button
                        type="button"
                        className="dropdown-item"
                        onClick={() => {
                          setMovingItem({ id: file.id, name: file.filename, type: 'file' });
                          setDestinationFolderId(currentFolderId);
                          setActiveMenuId(null);
                        }}
                      >
                        <i className="fas fa-arrows-alt" aria-hidden="true" /> Move
                      </button>
                      <button
                        type="button"
                        className="dropdown-item danger"
                        onClick={async () => {
                          if (confirm(`Move "${file.filename}" to trash?`)) {
                            await deleteFileMut.mutateAsync(file.id);
                          }
                          setActiveMenuId(null);
                        }}
                      >
                        <i className="fas fa-trash-alt" aria-hidden="true" /> Trash
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            </>
          )}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {totalSelectedCount > 0 && (
          <motion.div
            id="bulk-actions-bar"
            className="bulk-actions-bar show"
            initial={{ opacity: 0, y: 30, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 30, x: '-50%' }}
            transition={springs.gentle}
          >
            <div className="bulk-selected-count">
              <span id="bulk-selected-text">
                {totalSelectedCount} item{totalSelectedCount > 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="bulk-action-buttons">
              <button type="button" className="btn btn-secondary" id="bulk-clear-btn" onClick={handleClearSelection}>
                <i className="fas fa-times" aria-hidden="true" /> Cancel
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                id="bulk-move-btn"
                onClick={() => {
                  setBulkDestinationFolderId(null);
                  setIsBulkMoveOpen(true);
                }}
              >
                <i className="fas fa-arrows-alt" aria-hidden="true" /> Move
              </button>
              <button
                type="button"
                className="btn btn-danger"
                id="bulk-delete-btn"
                style={{ backgroundColor: 'var(--warning-red)', color: 'white', borderColor: 'var(--warning-red)' }}
                onClick={handleBulkDelete}
              >
                <i className="fas fa-trash-alt" aria-hidden="true" /> Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Floating Action Button (FAB) Menu */}
      <div className="mobile-fab-container">
        <button
          type="button"
          className={`fab-btn ${mobileFabOpen ? 'active' : ''}`}
          id="mobile-fab"
          aria-label="Add new item"
          onClick={() => setMobileFabOpen(!mobileFabOpen)}
          style={{
            transform: mobileFabOpen ? 'rotate(45deg)' : 'rotate(0deg)',
            transition: 'transform var(--motion-duration-fast) var(--motion-ease-out)',
          }}
        >
          <i className="fas fa-plus" aria-hidden="true" />
        </button>
        <AnimatePresence>
          {mobileFabOpen && (
            <motion.div
              className="fab-menu open"
              id="fab-menu"
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={springs.snappy}
            >
              <button
                type="button"
                className="fab-menu-item"
                id="fab-upload-file"
                title="Upload File"
                onClick={() => {
                  fileInputRef.current?.click();
                  setMobileFabOpen(false);
                }}
              >
                <i className="fas fa-cloud-upload-alt" aria-hidden="true" />
                <span>Upload File</span>
              </button>
              <button
                type="button"
                className="fab-menu-item"
                id="fab-new-folder"
                title="New Folder"
                onClick={() => {
                  setIsNewFolderOpen(true);
                  setMobileFabOpen(false);
                }}
              >
                <i className="fas fa-folder-plus" aria-hidden="true" />
                <span>New Folder</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Create Folder Dialog */}
      <AnimatePresence>
        {isNewFolderOpen && (
          <motion.div
            id="modal-create-folder"
            className="modal-overlay show"
            variants={modalBackdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={() => setIsNewFolderOpen(false)}
          >
            <motion.div
              className="famdoc-modal"
              variants={modalDialogVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3 className="modal-title">Create Folder</h3>
                <button
                  type="button"
                  className="modal-close"
                  aria-label="Close modal"
                  onClick={() => setIsNewFolderOpen(false)}
                >
                  <i className="fas fa-times" aria-hidden="true" />
                </button>
              </div>
              <form id="form-create-folder" onSubmit={handleCreateFolder}>
                <div className="modal-body">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="new-folder-name" className="form-label">
                      Folder Name
                    </label>
                    <input
                      type="text"
                      id="new-folder-name"
                      className="form-control"
                      placeholder="e.g. Tax Receipts"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      required
                      maxLength={50}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary modal-close-btn"
                    onClick={() => setIsNewFolderOpen(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rename Item Dialog */}
      <AnimatePresence>
        {renamingItem && (
          <motion.div
            id="modal-rename"
            className="modal-overlay show"
            variants={modalBackdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={() => setRenamingItem(null)}
          >
            <motion.div
              className="famdoc-modal"
              variants={modalDialogVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3 className="modal-title">Rename {renamingItem.type === 'folder' ? 'Folder' : 'File'}</h3>
                <button
                  type="button"
                  className="modal-close"
                  aria-label="Close modal"
                  onClick={() => setRenamingItem(null)}
                >
                  <i className="fas fa-times" aria-hidden="true" />
                </button>
              </div>
              <form id="form-rename" onSubmit={handleRename}>
                <div className="modal-body">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="rename-input" className="form-label">
                      New Name
                    </label>
                    <input
                      type="text"
                      id="rename-input"
                      className="form-control"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      required
                      maxLength={100}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary modal-close-btn"
                    onClick={() => setRenamingItem(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Rename
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Move Item Dialog Modal */}
      <AnimatePresence>
        {movingItem && (
          <motion.div
            id="modal-move"
            className="modal-overlay show"
            variants={modalBackdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={() => setMovingItem(null)}
          >
            <motion.div
              className="famdoc-modal"
              variants={modalDialogVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              style={{ maxWidth: '440px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3 className="modal-title">Move {movingItem.type === 'folder' ? 'Folder' : 'File'}</h3>
                <button
                  type="button"
                  className="modal-close"
                  aria-label="Close modal"
                  onClick={() => setMovingItem(null)}
                >
                  <i className="fas fa-times" aria-hidden="true" />
                </button>
              </div>
              <form onSubmit={handleMoveSubmit}>
                <div className="modal-body" style={{ padding: '1.25rem' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-ink-muted)', marginBottom: '1rem' }}>
                    Select destination directory for <strong>{movingItem.name}</strong>:
                  </p>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="move-destination-select" className="form-label">
                      Target Folder
                    </label>
                    <select
                      id="move-destination-select"
                      className="form-control"
                      value={destinationFolderId === null ? '' : String(destinationFolderId)}
                      onChange={(e) => setDestinationFolderId(e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">📁 Root Vault (Home)</option>
                      {allFolders
                        .filter((f) => movingItem.type !== 'folder' || f.id !== movingItem.id)
                        .map((f) => (
                          <option key={f.id} value={f.id}>
                            📁 {f.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary modal-close-btn"
                    onClick={() => setMovingItem(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Move Here
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Move Dialog Modal */}
      <AnimatePresence>
        {isBulkMoveOpen && (
          <motion.div
            id="modal-bulk-move"
            className="modal-overlay show"
            variants={modalBackdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={() => setIsBulkMoveOpen(false)}
          >
            <motion.div
              className="famdoc-modal"
              variants={modalDialogVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              style={{ maxWidth: '440px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3 className="modal-title">Move Selected Items</h3>
                <button
                  type="button"
                  className="modal-close"
                  aria-label="Close modal"
                  onClick={() => setIsBulkMoveOpen(false)}
                >
                  <i className="fas fa-times" aria-hidden="true" />
                </button>
              </div>
              <form onSubmit={handleBulkMoveSubmit}>
                <div className="modal-body" style={{ padding: '1.25rem' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-ink-muted)', marginBottom: '1rem' }}>
                    Move <strong>{totalSelectedCount}</strong> selected items to:
                  </p>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="bulk-move-destination-select" className="form-label">
                      Target Folder
                    </label>
                    <select
                      id="bulk-move-destination-select"
                      className="form-control"
                      value={bulkDestinationFolderId === null ? '' : String(bulkDestinationFolderId)}
                      onChange={(e) => setBulkDestinationFolderId(e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">📁 Root Vault (Home)</option>
                      {allFolders
                        .filter((f) => !selectedFolderIds.includes(f.id))
                        .map((f) => (
                          <option key={f.id} value={f.id}>
                            📁 {f.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary modal-close-btn"
                    onClick={() => setIsBulkMoveOpen(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Move All
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Link Dialog */}
      <AnimatePresence>
        {activeShareFile && (
          <motion.div
            id="modal-share"
            className="modal-overlay show"
            variants={modalBackdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={() => setActiveShareFile(null)}
          >
            <motion.div
              className="famdoc-modal"
              variants={modalDialogVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              style={{ maxWidth: '550px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3 className="modal-title">Share Vault Item</h3>
                <button
                  type="button"
                  className="modal-close"
                  aria-label="Close modal"
                  onClick={() => setActiveShareFile(null)}
                >
                  <i className="fas fa-times" aria-hidden="true" />
                </button>
              </div>
              <div className="modal-body">
                <h4 id="share-filename" style={{ fontFamily: 'var(--font-serif)', marginBottom: '1.25rem' }}>
                  {activeShareFile.filename}
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-ink-muted)' }}>
                  Direct Link:
                </p>
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface-paper-tint)',
                    border: '1px solid var(--border-paper)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8rem',
                    wordBreak: 'break-all',
                    marginBottom: '1rem',
                  }}
                >
                  {api.files.getDownloadUrl(activeShareFile.id, activeShareFile.preview_token)}
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  onClick={() => {
                    navigator.clipboard.writeText(api.files.getDownloadUrl(activeShareFile.id, activeShareFile.preview_token));
                    alert('Download link copied to clipboard!');
                  }}
                >
                  <i className="fas fa-copy" aria-hidden="true" /> Copy Download URL
                </button>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary modal-close-btn"
                  onClick={() => setActiveShareFile(null)}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media Preview Modal - Modern Cinema Lightbox */}
      <AnimatePresence>
        {activePreviewFile && (
          <motion.div
            id="modal-preview"
            className="modal-overlay show"
            variants={modalBackdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={() => setActivePreviewFile(null)}
          >
            <motion.div
              className="famdoc-modal preview-modal"
              variants={modalDialogVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden', minWidth: 0, flex: 1, marginRight: '1rem' }}>
                  <i
                    className={`item-icon ${api.helpers.getFileIconClass(activePreviewFile.filename, activePreviewFile.file_type)}`}
                    style={{ fontSize: '1.25rem', flexShrink: 0 }}
                    aria-hidden="true"
                  />
                  <div style={{ overflow: 'hidden', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h3
                        className="modal-title"
                        id="preview-title"
                        style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0, fontSize: '0.98rem' }}
                        title={activePreviewFile.filename}
                      >
                        {activePreviewFile.filename}
                      </h3>
                      <span className="preview-badge">
                        {api.helpers.getFileFormatLabel(activePreviewFile.filename, activePreviewFile.file_type)}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.73rem', color: '#94A3B8', marginTop: '0.15rem' }}>
                      {api.helpers.formatBytes(activePreviewFile.file_size ?? activePreviewFile.size_bytes ?? 0)} &bull; {api.helpers.formatDate(activePreviewFile.created_at ?? activePreviewFile.upload_date)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                  <a
                    href={api.files.getPreviewUrl(activePreviewFile.id, activePreviewFile.preview_token)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                    title="Open in new tab"
                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', textDecoration: 'none' }}
                  >
                    <i className="fas fa-external-link-alt" aria-hidden="true" />
                    <span className="hide-on-mobile">Open</span>
                  </a>
                  <a
                    href={api.files.getDownloadUrl(activePreviewFile.id, activePreviewFile.preview_token)}
                    download={api.helpers.ensureFilenameWithExtension(activePreviewFile.filename, activePreviewFile.file_type)}
                    id="preview-download-btn"
                    className="btn btn-primary btn-sm"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', textDecoration: 'none' }}
                  >
                    <i className="fas fa-download" aria-hidden="true" />
                    <span>Download</span>
                  </a>
                  <button
                    type="button"
                    className="modal-close"
                    aria-label="Close modal"
                    onClick={() => setActivePreviewFile(null)}
                  >
                    <i className="fas fa-times" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="preview-body" id="preview-content-area">
                {/* Prev / Next Navigation Arrows */}
                {hasPrevFile && (
                  <button
                    type="button"
                    className="preview-nav-btn preview-nav-prev"
                    aria-label="Previous file"
                    title="Previous file (Left Arrow)"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrevFile();
                    }}
                  >
                    <i className="fas fa-chevron-left" aria-hidden="true" />
                  </button>
                )}

                {hasNextFile && (
                  <button
                    type="button"
                    className="preview-nav-btn preview-nav-next"
                    aria-label="Next file"
                    title="Next file (Right Arrow)"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextFile();
                    }}
                  >
                    <i className="fas fa-chevron-right" aria-hidden="true" />
                  </button>
                )}

                {(activePreviewFile.file_type?.toLowerCase().includes('image') ||
                  /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(activePreviewFile.filename)) ? (
                  <>
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: previewZoom > 1 ? 'auto' : 'hidden',
                      }}
                    >
                      <img
                        src={api.files.getPreviewUrl(activePreviewFile.id, activePreviewFile.preview_token)}
                        alt={activePreviewFile.filename}
                        className="preview-image"
                        style={{
                          transform: `scale(${previewZoom})`,
                          transformOrigin: 'center center',
                          cursor: previewZoom === 1 ? 'zoom-in' : 'zoom-out',
                        }}
                        onClick={() => setPreviewZoom((z) => (z === 1 ? 1.75 : 1))}
                      />
                    </div>

                    {/* Zoom Controls Toolbar */}
                    <div className="preview-toolbar" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="preview-toolbar-btn"
                        title="Zoom Out (-)"
                        disabled={previewZoom <= 0.5}
                        onClick={() => setPreviewZoom((z) => Math.max(0.5, z - 0.25))}
                      >
                        <i className="fas fa-minus" aria-hidden="true" />
                      </button>
                      <span className="preview-zoom-label">{Math.round(previewZoom * 100)}%</span>
                      <button
                        type="button"
                        className="preview-toolbar-btn"
                        title="Zoom In (+)"
                        disabled={previewZoom >= 3}
                        onClick={() => setPreviewZoom((z) => Math.min(3, z + 0.25))}
                      >
                        <i className="fas fa-plus" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="preview-toolbar-btn"
                        title="Reset Zoom (0)"
                        onClick={() => setPreviewZoom(1)}
                      >
                        <i className="fas fa-redo-alt" aria-hidden="true" />
                      </button>
                    </div>
                  </>
                ) : (activePreviewFile.file_type?.toLowerCase().includes('video') ||
                     /\.(mp4|mkv|webm|mov|avi)$/i.test(activePreviewFile.filename)) ? (
                  <video
                    src={api.files.getPreviewUrl(activePreviewFile.id, activePreviewFile.preview_token)}
                    controls
                    autoPlay
                    className="preview-video"
                  />
                ) : (activePreviewFile.file_type?.toLowerCase().includes('pdf') ||
                     activePreviewFile.filename.toLowerCase().endsWith('.pdf')) ? (
                  <iframe
                    src={api.files.getPreviewUrl(activePreviewFile.id, activePreviewFile.preview_token)}
                    title={activePreviewFile.filename}
                    className="preview-frame"
                  />
                ) : (
                  <div style={{ padding: '3rem', textAlign: 'center', color: '#F8FAFC' }}>
                    <i
                      className={`item-icon ${api.helpers.getFileIconClass(
                        activePreviewFile.filename,
                        activePreviewFile.file_type
                      )}`}
                      style={{ fontSize: '3.5rem', marginBottom: '1rem', display: 'inline-block' }}
                      aria-hidden="true"
                    />
                    <h4 style={{ fontFamily: 'var(--font-serif)', marginBottom: '0.5rem', color: '#FFFFFF' }}>
                      Preview not supported for this file type
                    </h4>
                    <p style={{ color: '#94A3B8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                      {activePreviewFile.filename} ({api.helpers.formatBytes(activePreviewFile.file_size ?? activePreviewFile.size_bytes ?? 0)})
                    </p>
                    <a
                      href={api.files.getDownloadUrl(activePreviewFile.id, activePreviewFile.preview_token)}
                      download={api.helpers.ensureFilenameWithExtension(activePreviewFile.filename, activePreviewFile.file_type)}
                      className="btn btn-primary"
                      style={{ textDecoration: 'none' }}
                    >
                      <i className="fas fa-download" aria-hidden="true" /> Download File
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
