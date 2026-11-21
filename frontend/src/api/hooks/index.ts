import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import type { SearchParams } from '../types';

export const queryKeys = {
  authMe: ['auth', 'me'] as const,
  folders: ['folders'] as const,
  files: (folderId: number | null) => ['files', folderId] as const,
  search: (params: SearchParams) => ['search', params] as const,
  dashboard: ['dashboard', 'stats'] as const,
  storageConfig: ['storage', 'config'] as const,
  storageAccounts: ['storage', 'accounts'] as const,
  familyDetails: ['family', 'details'] as const,
  familyMembers: ['family', 'members'] as const,
  trash: ['trash'] as const,
  shareLinks: (fileId: number) => ['share', 'file', fileId] as const,
  publicShare: (token: string) => ['share', 'public', token] as const,
};

// ── Auth Hooks ──
export function useCurrentUser() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('famdoc_token') : null;
  return useQuery({
    queryKey: queryKeys.authMe,
    queryFn: () => api.auth.me(),
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000,
  });
}

// ── Dashboard Hooks ──
export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => api.dashboard.getStats(),
    staleTime: 30 * 1000,
  });
}

// ── Folders & Files Hooks ──
export function useFolders() {
  return useQuery({
    queryKey: queryKeys.folders,
    queryFn: () => api.folders.getFolders(),
    staleTime: 60 * 1000,
  });
}

export function useFiles(folderId: number | null = null) {
  return useQuery({
    queryKey: queryKeys.files(folderId),
    queryFn: () => api.files.getFiles(folderId),
    staleTime: 30 * 1000,
  });
}

export function useSearchFiles(params: SearchParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.search(params),
    queryFn: () => api.search.search(params),
    enabled: enabled && (Boolean(params.query) || Boolean(params.category)),
    staleTime: 10 * 1000,
  });
}

export function useCreateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, parentId }: { name: string; parentId?: number | null }) =>
      api.folders.create(name, parentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.folders });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useRenameFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ folderId, name }: { folderId: number; name: string }) =>
      api.folders.rename(folderId, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.folders });
    },
  });
}

export function useMoveFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ folderId, parentId }: { folderId: number; parentId: number | null }) =>
      api.folders.move(folderId, parentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.folders });
    },
  });
}

export function useDeleteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (folderId: number) => api.folders.delete(folderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.folders });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
      qc.invalidateQueries({ queryKey: queryKeys.trash });
    },
  });
}

export function useRenameFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fileId, filename }: { fileId: number; filename: string }) =>
      api.files.rename(fileId, filename),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['files'] });
    },
  });
}

export function useMoveFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fileId, folderId }: { fileId: number; folderId: number | null }) =>
      api.files.move(fileId, folderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['files'] });
      qc.invalidateQueries({ queryKey: queryKeys.folders });
    },
  });
}

export function useDeleteFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fileId: number) => api.files.delete(fileId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['files'] });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
      qc.invalidateQueries({ queryKey: queryKeys.trash });
    },
  });
}

// ── Storage Hooks ──
export function useStorageConfig() {
  return useQuery({
    queryKey: queryKeys.storageConfig,
    queryFn: () => api.storage.getConfig(),
    staleTime: 60 * 1000,
  });
}

export function useStorageAccounts() {
  return useQuery({
    queryKey: queryKeys.storageAccounts,
    queryFn: () => api.storage.getAccounts(),
    staleTime: 60 * 1000,
  });
}

export function useUpdateStorageMode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (provider: string) => api.storage.updateMode(provider),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.storageConfig });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useDeleteStorageAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (accountId: number) => api.storage.deleteAccount(accountId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.storageAccounts });
      qc.invalidateQueries({ queryKey: queryKeys.storageConfig });
    },
  });
}

// ── Family Hooks ──
export function useFamilyDetails() {
  return useQuery({
    queryKey: queryKeys.familyDetails,
    queryFn: () => api.family.getDetails(),
    staleTime: 60 * 1000,
  });
}

export function useFamilyMembers() {
  return useQuery({
    queryKey: queryKeys.familyMembers,
    queryFn: () => api.family.getMembers(),
    staleTime: 30 * 1000,
  });
}

export function useRemoveFamilyMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => api.family.removeMember(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.familyMembers });
      qc.invalidateQueries({ queryKey: queryKeys.familyDetails });
    },
  });
}

export function useUpdateFamilyDetails() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { name: string; maxMembers: number }) =>
      api.family.updateDetails(vars.name, vars.maxMembers),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.familyDetails });
      qc.invalidateQueries({ queryKey: queryKeys.familyMembers });
    },
  });
}

export function useRegenerateSecretCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars?: { name?: string; maxMembers?: number }) =>
      api.family.regenerateCode(vars?.name, vars?.maxMembers),
    onSuccess: (data) => {
      if (data?.secret_code) {
        localStorage.setItem('famdoc_family_secret_code', data.secret_code);
        const expiresAt = data.expires_at || new Date(Date.now() + 60 * 1000).toISOString();
        localStorage.setItem('famdoc_family_code_expires_at', expiresAt);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('famdoc:secret-code-updated', {
              detail: { secret_code: data.secret_code, expires_at: expiresAt },
            })
          );
        }
      }
      qc.invalidateQueries({ queryKey: queryKeys.familyDetails });
    },
  });
}

// ── Trash Hooks ──
export function useTrashItems() {
  return useQuery({
    queryKey: queryKeys.trash,
    queryFn: () => api.trash.get(),
    staleTime: 15 * 1000,
  });
}

export function useRestoreTrash() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemType, itemId }: { itemType: 'file' | 'folder'; itemId: number }) =>
      api.trash.restore(itemType, itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.trash });
      qc.invalidateQueries({ queryKey: queryKeys.folders });
      qc.invalidateQueries({ queryKey: ['files'] });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function usePurgeTrash() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemType, itemId }: { itemType: 'file' | 'folder'; itemId: number }) =>
      api.trash.purge(itemType, itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.trash });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

// ── Share Hooks ──
export function useShareLinks(fileId: number) {
  return useQuery({
    queryKey: queryKeys.shareLinks(fileId),
    queryFn: () => api.sharing.getLinks(fileId),
    enabled: fileId > 0,
  });
}

export function useCreateShareLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      fileId,
      password,
      expiresAt,
      maxDownloads,
    }: {
      fileId: number;
      password?: string | null;
      expiresAt?: string | null;
      maxDownloads?: number | null;
    }) => api.sharing.createLink(fileId, password, expiresAt, maxDownloads),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.shareLinks(vars.fileId) });
    },
  });
}

export function useRevokeShareLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ token, fileId }: { token: string; fileId: number }) =>
      api.sharing.revokeLink(token),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.shareLinks(vars.fileId) });
    },
  });
}

export function usePublicShareInfo(token: string) {
  return useQuery({
    queryKey: queryKeys.publicShare(token),
    queryFn: () => api.sharing.getPublicInfo(token),
    enabled: Boolean(token),
  });
}
