export type UserRole = 'admin' | 'member' | 'guest';

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  family_id?: number | null;
  family_name?: string | null;
  created_at?: string;
  avatar_url?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user?: User;
}

export interface Folder {
  id: number;
  name: string;
  parent_id?: number | null;
  created_at: string;
  updated_at?: string;
  last_modified?: string;
  file_count?: number;
  total_size?: number;
}

export interface FileItem {
  id: number;
  filename: string;
  original_name?: string;
  file_type: string;
  file_size: number;
  size_bytes?: number;
  folder_id?: number | null;
  category?: 'video' | 'images' | 'pdfs' | 'docs' | 'sheets' | 'text' | 'other';
  storage_provider?: string;
  download_count?: number;
  created_at: string;
  upload_date?: string;
  updated_at?: string;
  uploader_username?: string;
}

export interface CategoryBreakdown {
  video: number;
  images: number;
  pdfs: number;
  docs: number;
  sheets: number;
  text: number;
  other: number;
}

export interface DashboardStats {
  total_files: number;
  total_folders: number;
  total_storage_bytes?: number;
  total_size_bytes?: number;
  total_members?: number;
  used_storage_bytes?: number;
  storage_provider?: string;
  storage_quota_bytes?: number;
  storage_breakdown?: Record<string, { size: number; count: number }>;
  category_breakdown?: CategoryBreakdown;
  recent_files?: FileItem[];
  recent_uploads?: FileItem[];
  recent_activity?: Array<{
    id: number;
    action: string;
    target_name?: string;
    timestamp: string;
    actor_username?: string;
    username?: string;
    details?: string;
    user_email?: string;
  }>;
}

export interface StorageConfig {
  storage_provider?: string;
  active_provider?: string;
  is_configured?: boolean;
  client_id?: string | null;
  google_configured?: boolean;
  has_env_credentials?: boolean;
  user_contributed_storage_bytes?: number;
  user_has_connected_account?: boolean;
  accounts?: StorageAccount[];
  total_capacity_bytes: number;
  total_used_bytes?: number;
  used_bytes?: number;
  free_bytes?: number;
  google_accounts_count?: number;
  is_pooling_active?: boolean;
}

export interface StorageAccount {
  id: number;
  family_id?: string;
  provider?: string;
  email?: string;
  account_email?: string;
  label?: string;
  status: 'active' | 'error' | 'disconnecting' | 'disconnected' | string;
  priority?: number;
  user_id?: number | null;
  member_username?: string | null;
  member_email?: string | null;
  member_role?: string | null;
  cached_quota_total?: number | null;
  cached_quota_used?: number | null;
  storage_limit_bytes?: number;
  storage_used_bytes?: number;
  is_active?: boolean;
  needs_reauth?: boolean;
  connected_at?: string;
  created_at?: string;
  display_name?: string;
}

export interface FamilyDetails {
  id: number | string;
  name: string;
  secret_code?: string;
  admin_id?: number;
  max_members: number;
  member_count?: number;
  created_at: string;
  expires_at?: string;
}

export interface FamilySetupResponse {
  family_id: string;
  name: string;
  secret_code: string;
  max_members: number;
  expires_at?: string;
}

export interface FamilyMember {
  id: number;
  user_id: number;
  family_id?: string;
  username: string;
  email: string;
  role: UserRole;
  joined_at: string;
  storage_connected?: boolean;
  storage_contributed_bytes?: number;
  storage_account_email?: string | null;
}

export interface ShareLink {
  id: number;
  token: string;
  file_id: number;
  file_name?: string;
  file_size?: number;
  expires_at?: string | null;
  max_downloads?: number | null;
  download_count: number;
  has_password: boolean;
  created_at: string;
}

export interface PublicShareInfo {
  token: string;
  file_name: string;
  file_size: number;
  file_type: string;
  has_password: boolean;
  expires_at?: string | null;
  uploader_username?: string;
}

export interface TrashItem {
  id: number;
  item_type: 'file' | 'folder';
  name: string;
  filename?: string;
  original_folder_id?: number | null;
  size?: number;
  size_bytes?: number;
  deleted_at: string;
}

export interface SearchParams {
  query?: string;
  category?: string;
  folder_id?: number | null;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}
