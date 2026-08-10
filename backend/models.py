from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Boolean, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
from typing import Optional

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=True) # Nullable for family members created without passwords
    role = Column(String(50), default="member") # "admin" or "member"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    current_token_jti = Column(String(64), nullable=True)

    # Relationships
    families_administered = relationship("Family", back_populates="admin")
    family_memberships = relationship("FamilyMember", back_populates="user", cascade="all, delete-orphan")
    uploaded_files = relationship("File", back_populates="uploader", foreign_keys="File.uploader_id")

    @property
    def family_id(self) -> Optional[str]:
        if self.family_memberships:
            return self.family_memberships[0].family_id
        return None

    @property
    def family(self) -> Optional['Family']:
        if self.family_memberships:
            return self.family_memberships[0].family


class Family(Base):
    __tablename__ = "families"

    id = Column(String(36), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    admin_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    secret_code_hash = Column(String(255), nullable=False)
    secret_code_sha256 = Column(String(64), unique=True, index=True, nullable=True)
    max_members = Column(Integer, nullable=False, default=10)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Old storage fields kept for compatibility with other FDM features
    storage_provider = Column(String(50), nullable=True) # "google"
    _storage_config = Column("storage_config", String(2048), nullable=True) # Config details (tokens or login)
    vault_folder_id = Column(String(255), nullable=True) # Root folder ID in Google Drive
    storage_quota_bytes = Column(Integer, nullable=False, default=524288000) # Default 500MB

    @property
    def storage_config(self) -> Optional[dict]:
        if not self._storage_config:
            return None
        from utils.crypto import decrypt_config
        return decrypt_config(self._storage_config)

    @storage_config.setter
    def storage_config(self, value: Optional[dict]):
        if value is None:
            self._storage_config = None
        else:
            from utils.crypto import encrypt_config
            self._storage_config = encrypt_config(value)

    # Relationships
    admin = relationship("User", back_populates="families_administered")
    members = relationship("FamilyMember", back_populates="family", cascade="all, delete-orphan")
    folders = relationship("Folder", back_populates="family", cascade="all, delete-orphan")
    files = relationship("File", back_populates="family", cascade="all, delete-orphan")


class FamilyMember(Base):
    __tablename__ = "family_members"
    __table_args__ = (
        UniqueConstraint('family_id', 'user_id', name='uq_family_member'),
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    family_id = Column(String(36), ForeignKey("families.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(50), default="member") # "admin" or "member"
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    family = relationship("Family", back_populates="members")
    user = relationship("User", back_populates="family_memberships")

    @property
    def username(self) -> str:
        return self.user.username if self.user else ""

    @property
    def email(self) -> str:
        return self.user.email if self.user else ""



class Folder(Base):
    __tablename__ = "folders"
    __table_args__ = (
        Index('ix_folders_family_parent_deleted', 'family_id', 'parent_id', 'deleted_at'),
        Index('ix_folders_cloud_folder_id', 'cloud_folder_id'),
        Index('ix_folders_google_drive_folder_id', 'google_drive_folder_id'),
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    parent_id = Column(Integer, ForeignKey("folders.id", ondelete="CASCADE"), nullable=True, index=True)
    family_id = Column(String(36), ForeignKey("families.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True, index=True)
    deletion_batch_id = Column(String(36), nullable=True, index=True)
    cloud_folder_id = Column(String(255), nullable=True)
    google_drive_folder_id = Column(String(255), nullable=True)

    # Relationships
    family = relationship("Family", back_populates="folders")
    files = relationship("File", back_populates="folder")
    parent = relationship("Folder", remote_side=[id], backref="subfolders")


class File(Base):
    __tablename__ = "files"
    __table_args__ = (
        Index('ix_files_family_folder_deleted', 'family_id', 'folder_id', 'deleted_at'),
        Index('ix_files_family_deleted', 'family_id', 'deleted_at'),
        Index('ix_files_cloud_file_id', 'cloud_file_id'),
        Index('ix_files_google_drive_file_id', 'google_drive_file_id'),
        Index('ix_files_local_file_id', 'local_file_id'),
        Index('ix_files_pending_sync_retry', 'pending_sync', 'sync_retry_count'),
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(100), nullable=False) # MIME type or category
    size_bytes = Column(Integer, nullable=False)
    uploader_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    folder_id = Column(Integer, ForeignKey("folders.id", ondelete="CASCADE"), nullable=True, index=True)
    family_id = Column(String(36), ForeignKey("families.id", ondelete="CASCADE"), nullable=False, index=True)
    upload_date = Column(DateTime(timezone=True), server_default=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True, index=True)
    deletion_batch_id = Column(String(36), nullable=True, index=True)
    storage_provider = Column(String(50), default="local", nullable=False) # "local" or "google"
    _file_id = Column("file_id", String(255), nullable=True) # Legacy DB column
    local_file_id = Column(String(255), nullable=True)
    cloud_file_id = Column(String(255), nullable=True)
    google_drive_file_id = Column(String(255), nullable=True)
    primary_storage = Column(String(50), nullable=True)
    backup_status = Column(String(50), nullable=True)
    
    @property
    def file_id(self) -> str:
        return self.cloud_file_id or self.local_file_id or self._file_id

    @file_id.setter
    def file_id(self, value: str):
        self._file_id = value
        if self.storage_provider == "local" or self.storage_provider is None:
            self.local_file_id = value
        else:
            self.cloud_file_id = value
    cloud_link = Column(String(1024), nullable=True) # Direct preview/download web url
    pending_sync = Column(Boolean, default=True, nullable=False) # True = awaiting cloud upload
    pending_sync_at = Column(DateTime(timezone=True), nullable=True) # When the file was flagged for sync
    synced_to = Column(String(50), nullable=True) # "google" or None
    lock_acquired_at = Column(DateTime(timezone=True), nullable=True, index=True)
    lock_holder = Column(String(255), nullable=True, index=True)
    sync_retry_count = Column(Integer, default=0, nullable=False)

    # Relationships
    family = relationship("Family", back_populates="files")
    uploader = relationship("User", back_populates="uploaded_files", foreign_keys=[uploader_id])
    folder = relationship("Folder", back_populates="files")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = (
        Index('ix_audit_logs_family_timestamp', 'family_id', 'timestamp'),
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    action = Column(String(50), nullable=False, index=True) # "LOGIN", "LOGOUT", "UPLOAD", "DELETE", "RENAME", "DOWNLOAD"
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    family_id = Column(String(36), ForeignKey("families.id", ondelete="CASCADE"), nullable=True, index=True)
    ip_address = Column(String(45), nullable=True)
    details = Column(String(1024), nullable=True)

    user = relationship("User")


class SharedLink(Base):
    __tablename__ = "shared_links"

    id = Column(String(32), primary_key=True, index=True) # Unique random sharing token
    file_id = Column(Integer, ForeignKey("files.id", ondelete="CASCADE"), nullable=False, index=True)
    family_id = Column(String(36), ForeignKey("families.id", ondelete="CASCADE"), nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True, index=True)
    max_downloads = Column(Integer, nullable=True)
    download_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    # Relationships
    file = relationship("File")
    creator = relationship("User")


class RevokedToken(Base):
    __tablename__ = "revoked_tokens"

    jti = Column(String(64), primary_key=True, index=True)
    revoked_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
