import { create } from 'zustand';
import type { FileItem } from '../api/types';

interface VaultState {
  currentFolderId: number | null;
  viewMode: 'grid' | 'list';
  searchQuery: string;
  selectedCategory: string | null;
  activePreviewFile: FileItem | null;
  activeShareFile: FileItem | null;
  selectedFileIds: number[];
  isUploadModalOpen: boolean;
  isNewFolderModalOpen: boolean;

  setCurrentFolderId: (id: number | null) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (cat: string | null) => void;
  setActivePreviewFile: (file: FileItem | null) => void;
  setActiveShareFile: (file: FileItem | null) => void;
  toggleSelectFile: (fileId: number) => void;
  clearSelectedFiles: () => void;
  selectAllFiles: (ids: number[]) => void;
  setIsUploadModalOpen: (open: boolean) => void;
  setIsNewFolderModalOpen: (open: boolean) => void;
}

export const useVaultStore = create<VaultState>((set) => {
  const initialView =
    (typeof window !== 'undefined' && localStorage.getItem('famdoc_view_mode') as 'grid' | 'list') || 'grid';

  return {
    currentFolderId: null,
    viewMode: initialView,
    searchQuery: '',
    selectedCategory: null,
    activePreviewFile: null,
    activeShareFile: null,
    selectedFileIds: [],
    isUploadModalOpen: false,
    isNewFolderModalOpen: false,

    setCurrentFolderId: (id) => set({ currentFolderId: id }),

    setViewMode: (mode) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('famdoc_view_mode', mode);
      }
      set({ viewMode: mode });
    },

    setSearchQuery: (searchQuery) => set({ searchQuery }),
    setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
    setActivePreviewFile: (activePreviewFile) => set({ activePreviewFile }),
    setActiveShareFile: (activeShareFile) => set({ activeShareFile }),

    toggleSelectFile: (fileId) =>
      set((state) => ({
        selectedFileIds: state.selectedFileIds.includes(fileId)
          ? state.selectedFileIds.filter((id) => id !== fileId)
          : [...state.selectedFileIds, fileId],
      })),

    clearSelectedFiles: () => set({ selectedFileIds: [] }),
    selectAllFiles: (ids) => set({ selectedFileIds: ids }),
    setIsUploadModalOpen: (open) => set({ isUploadModalOpen: open }),
    setIsNewFolderModalOpen: (open) => set({ isNewFolderModalOpen: open }),
  };
});
