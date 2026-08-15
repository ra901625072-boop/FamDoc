from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from datetime import datetime

# ==========================================
# Authentication & User Schemas
# ==========================================

class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=20, pattern=r"^[a-zA-Z0-9_]+$")
    email: EmailStr
    password: str = Field(..., min_length=8)
    
    @field_validator('password')
    def validate_password(cls, v):
        if not any(char.isupper() for char in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(char.isdigit() for char in v):
            raise ValueError('Password must contain at least one number')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    created_at: datetime
    family_id: Optional[str] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[int] = None
    role: Optional[str] = None
    scope: Optional[str] = None
    file_id: Optional[int] = None

class UserProfileUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=20, pattern=r"^[a-zA-Z0-9_\s]+$")
    password: Optional[str] = Field(None, min_length=8)
    
    @field_validator('password')
    def validate_password(cls, v):
        if v is None:
            return v
        if not any(char.isupper() for char in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(char.isdigit() for char in v):
            raise ValueError('Password must contain at least one number')
        return v

# ==========================================
# Family Schemas
# ==========================================

class FamilySetup(BaseModel):
    name: str = Field(..., min_length=2, max_length=40)
    max_members: int = Field(..., ge=2, le=20)

class FamilySetupResponse(BaseModel):
    family_id: str
    name: str
    secret_code: str # Plaintext, displayed only once
    max_members: int

class FamilyLogin(BaseModel):
    username: str = Field(..., min_length=3, max_length=20, pattern=r"^[a-zA-Z0-9_]+$")
    email: EmailStr
    secret_code: str = Field(..., min_length=9, max_length=9) # e.g. "XXXX-XXXX"
    password: str = Field(..., min_length=8)

    @field_validator('password')
    def validate_password(cls, v):
        if not any(char.isupper() for char in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(char.isdigit() for char in v):
            raise ValueError('Password must contain at least one number')
        return v

class FamilyResponse(BaseModel):
    id: str
    name: str
    admin_id: int
    max_members: int
    created_at: datetime
    expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class FamilyMemberResponse(BaseModel):
    id: int
    family_id: str
    user_id: int
    role: str
    joined_at: datetime
    username: Optional[str] = None
    email: Optional[str] = None

    class Config:
        from_attributes = True

# ==========================================
# Storage Configuration Schemas (Legacy/Existing)
# ==========================================

class StorageSetupGoogle(BaseModel):
    folder_id: str

class OAuthUrlRequest(BaseModel):
    client_id: Optional[str] = None
    client_secret: Optional[str] = None

class StorageConfigResponse(BaseModel):
    storage_provider: Optional[str] = None
    is_configured: bool
    folder_id: Optional[str] = None # For Google Drive configuration verification
    client_id: Optional[str] = None # For Google OAuth client verification
    google_configured: Optional[bool] = False
    # Deprecated fields kept for frontend compatibility
    email: Optional[str] = None
    mega_configured: Optional[bool] = False
    storage_mode: Optional[str] = "failover"
    primary_provider: Optional[str] = "google"

class StorageModeUpdate(BaseModel):
    storage_provider: str # "local" or "google"


# ==========================================
# Folder Schemas (Legacy/Existing)
# ==========================================

class FolderCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    parent_id: Optional[int] = None

class FolderRename(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)

class FolderMove(BaseModel):
    parent_id: Optional[int] = None

class FolderResponse(BaseModel):
    id: int
    name: str
    parent_id: Optional[int]
    family_id: str
    created_at: datetime
    file_count: int = 0
    total_size_bytes: int = 0
    last_modified: Optional[datetime] = None
    cloud_folder_id: Optional[str] = None

    class Config:
        from_attributes = True

# ==========================================
# File Schemas (Legacy/Existing)
# ==========================================

class FileRename(BaseModel):
    filename: str = Field(..., min_length=1, max_length=255)

class FileMove(BaseModel):
    folder_id: Optional[int] = None

class FileResponse(BaseModel):
    id: int
    filename: str
    file_type: str
    size_bytes: int
    uploader_id: Optional[int]
    uploader_email: Optional[str] = None
    folder_id: Optional[int]
    family_id: str
    upload_date: datetime
    storage_provider: str
    cloud_file_id: str
    cloud_link: Optional[str]
    is_shared: bool = False
    preview_token: Optional[str] = None

    class Config:
        from_attributes = True


# ==========================================
# Sharing Schemas
# ==========================================

class ShareLinkCreate(BaseModel):
    password: Optional[str] = Field(None, min_length=4, max_length=50)
    expires_at: Optional[datetime] = None
    max_downloads: Optional[int] = Field(None, ge=1)

class ShareLinkResponse(BaseModel):
    token: str
    file_id: int
    share_link: str
    is_password_protected: bool
    expires_at: Optional[datetime]
    max_downloads: Optional[int]
    download_count: int
    created_at: datetime


# ==========================================
# Password Reset Schemas
# ==========================================

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetVerify(BaseModel):
    email: EmailStr
    otp_code: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")

class PasswordResetConfirm(BaseModel):
    email: EmailStr
    otp_code: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")
    new_password: str = Field(..., min_length=8)

    @field_validator('new_password')
    def validate_password(cls, v):
        if not any(char.isupper() for char in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(char.isdigit() for char in v):
            raise ValueError('Password must contain at least one number')
        return v

