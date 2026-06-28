from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import DATABASE_URL

# Create database engine
# check_same_thread: False is needed only for SQLite to allow multiple threads
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args
)

# Enable foreign key support for SQLite
if DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def run_migrations():
    from sqlalchemy import inspect, text
    from logging_config import logger
    inspector = inspect(engine)
    table_names = inspector.get_table_names()
    
    # 1. Migrate families table
    if "families" in table_names:
        columns = [col["name"] for col in inspector.get_columns("families")]
        if "secret_code_sha256" not in columns:
            with engine.connect() as conn:
                try:
                    conn.execute(text("ALTER TABLE families ADD COLUMN secret_code_sha256 VARCHAR(64)"))
                    conn.execute(text("CREATE UNIQUE INDEX ix_families_secret_code_sha256 ON families(secret_code_sha256)"))
                    logger.info("Migration: Successfully added secret_code_sha256 column and index to families table.")
                except Exception as e:
                    logger.error(f"Migration error (families): {str(e)}")

    # 2. Migrate folders table
    if "folders" in table_names:
        columns = [col["name"] for col in inspector.get_columns("folders")]
        if "deleted_at" not in columns:
            with engine.connect() as conn:
                try:
                    conn.execute(text("ALTER TABLE folders ADD COLUMN deleted_at DATETIME"))
                    conn.execute(text("CREATE INDEX ix_folders_deleted_at ON folders(deleted_at)"))
                    logger.info("Migration: Successfully added deleted_at column to folders table.")
                except Exception as e:
                    logger.error(f"Migration error (folders): {str(e)}")
        if "deletion_batch_id" not in columns:
            with engine.connect() as conn:
                try:
                    conn.execute(text("ALTER TABLE folders ADD COLUMN deletion_batch_id VARCHAR(36)"))
                    conn.execute(text("CREATE INDEX ix_folders_deletion_batch_id ON folders(deletion_batch_id)"))
                    logger.info("Migration: Successfully added deletion_batch_id column and index to folders table.")
                except Exception as e:
                    logger.error(f"Migration error (folders deletion_batch_id): {str(e)}")

    # 3. Migrate files table
    if "files" in table_names:
        columns = [col["name"] for col in inspector.get_columns("files")]
        if "deleted_at" not in columns:
            with engine.connect() as conn:
                try:
                    conn.execute(text("ALTER TABLE files ADD COLUMN deleted_at DATETIME"))
                    conn.execute(text("CREATE INDEX ix_files_deleted_at ON files(deleted_at)"))
                    logger.info("Migration: Successfully added deleted_at column to files table.")
                except Exception as e:
                    logger.error(f"Migration error (files): {str(e)}")
        if "deletion_batch_id" not in columns:
            with engine.connect() as conn:
                try:
                    conn.execute(text("ALTER TABLE files ADD COLUMN deletion_batch_id VARCHAR(36)"))
                    conn.execute(text("CREATE INDEX ix_files_deletion_batch_id ON files(deletion_batch_id)"))
                    logger.info("Migration: Successfully added deletion_batch_id column and index to files table.")
                except Exception as e:
                    logger.error(f"Migration error (files deletion_batch_id): {str(e)}")
        if "cloud_file_id" in columns:
            with engine.connect() as conn:
                try:
                    conn.execute(text("ALTER TABLE files RENAME COLUMN cloud_file_id TO file_id"))
                    logger.info("Migration: Successfully renamed cloud_file_id to file_id.")
                except Exception as e:
                    logger.error(f"Migration error (rename cloud_file_id): {str(e)}")
        if "pending_sync" not in columns:
            with engine.connect() as conn:
                try:
                    conn.execute(text("ALTER TABLE files ADD COLUMN pending_sync INTEGER NOT NULL DEFAULT 1"))
                    conn.execute(text("CREATE INDEX ix_files_pending_sync ON files(pending_sync)"))
                    logger.info("Migration: Successfully added pending_sync column to files table.")
                except Exception as e:
                    logger.error(f"Migration error (files pending_sync): {str(e)}")
        if "pending_sync_at" not in columns:
            with engine.connect() as conn:
                try:
                    conn.execute(text("ALTER TABLE files ADD COLUMN pending_sync_at DATETIME"))
                    logger.info("Migration: Successfully added pending_sync_at column to files table.")
                except Exception as e:
                    logger.error(f"Migration error (files pending_sync_at): {str(e)}")
        if "synced_to" not in columns:
            with engine.connect() as conn:
                try:
                    conn.execute(text("ALTER TABLE files ADD COLUMN synced_to VARCHAR(50)"))
                    logger.info("Migration: Successfully added synced_to column to files table.")
                except Exception as e:
                    logger.error(f"Migration error (files synced_to): {str(e)}")
        if "storage_provider" not in columns:
            with engine.connect() as conn:
                try:
                    conn.execute(text("ALTER TABLE files ADD COLUMN storage_provider VARCHAR(50) NOT NULL DEFAULT 'local'"))
                    logger.info("Migration: Successfully added storage_provider column to files table.")
                except Exception as e:
                    logger.error(f"Migration error (files storage_provider): {str(e)}")
