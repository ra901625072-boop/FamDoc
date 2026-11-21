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
  active_provider: string;
  total_capacity_bytes: number;
  used_bytes: number;
  free_bytes: number;
  google_accounts_count?: number;
  is_pooling_active?: boolean;
}

export interface StorageAccount {
  id: number;
  account_email: string;
  display_name?: string;
  storage_limit_bytes: number;
  storage_used_bytes: number;
  is_active: boolean;
  needs_reauth?: boolean;
  connected_at: string;
}

export interface FamilyDetails {
  id: number;
  name: string;
  secret_code: string;
  max_members: number;
  member_count: number;
  created_at: string;
}

export interface FamilyMember {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  joined_at: string;
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
  original_folder_id?: number | null;
  size?: number;
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
