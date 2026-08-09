from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import DATABASE_URL

# Create database engine
# check_same_thread: False is needed only for SQLite to allow multiple threads
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    engine = create_engine(
        DATABASE_URL,
        connect_args=connect_args
    )
else:
    connect_args = {}
    engine = create_engine(
        DATABASE_URL,
        connect_args=connect_args,
        pool_size=5,
        max_overflow=5,
        pool_timeout=30,
        pool_recycle=1800,
        pool_pre_ping=True
    )

# Enable foreign key support and optimize performance for SQLite
if DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.execute("PRAGMA cache_size=-64000")  # 64MB cache size
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def execute_migration_statement(sql_statement):
    import time
    from logging_config import logger
    from sqlalchemy import text
    dialect = engine.dialect.name
    if dialect != "postgresql":
        with engine.begin() as conn:
            conn.execute(text(sql_statement))
        return

    # Retry loop to acquire lock
    for attempt in range(1, 4):
        try:
            with engine.begin() as conn:
                conn.execute(text("SET lock_timeout = '3s'"))
                conn.execute(text(sql_statement))
            return # Success!
        except Exception as e:
            err_msg = str(e).lower()
            if "lock" in err_msg or "timeout" in err_msg or "cancel" in err_msg:
                logger.warning(f"Lock timeout (attempt {attempt}/3) for: {sql_statement}. Terminating blocking backends...")
                try:
                    # Terminate other backends to break any locks in a fresh connection context
                    with engine.begin() as conn:
                        conn.execute(text("""
                            SELECT pg_terminate_backend(pid) 
                            FROM pg_stat_activity 
                            WHERE datname = current_database() 
                              AND pid <> pg_backend_pid()
                              AND state in ('idle in transaction', 'active')
                        """))
                except Exception as term_err:
                    logger.warning(f"Could not terminate backends: {term_err}")
                time.sleep(1)
            else:
                # Real error, raise it
                raise e

    # Final attempt: execute in blocking mode to guarantee success
    logger.warning(f"All lock-retries failed for: {sql_statement}. Executing in blocking mode...")
    try:
        with engine.begin() as conn:
            conn.execute(text("SET lock_timeout = 0"))
            conn.execute(text(sql_statement))
    except Exception as final_err:
        logger.error(f"Migration statement failed in blocking mode: {sql_statement}. Error: {final_err}")
        raise final_err


def run_migrations():
    from sqlalchemy import inspect, text
    from logging_config import logger
    inspector = inspect(engine)
    table_names = inspector.get_table_names()
    dialect_name = engine.dialect.name
    
    # Dialect-specific types
    datetime_type = "TIMESTAMP" if dialect_name == "postgresql" else "DATETIME"
    
    # 1. Migrate families table
    if "families" in table_names:
        columns = [col["name"] for col in inspector.get_columns("families")]
        if "secret_code_sha256" not in columns:
            try:
                execute_migration_statement("ALTER TABLE families ADD COLUMN secret_code_sha256 VARCHAR(64)")
                execute_migration_statement("CREATE UNIQUE INDEX ix_families_secret_code_sha256 ON families(secret_code_sha256)")
                logger.info("Migration: Successfully added secret_code_sha256 column and index to families table.")
            except Exception as e:
                logger.error(f"Migration error (families secret_code_sha256): {str(e)}")
        if "storage_quota_bytes" not in columns:
            try:
                execute_migration_statement("ALTER TABLE families ADD COLUMN storage_quota_bytes INTEGER NOT NULL DEFAULT 524288000")
                logger.info("Migration: Successfully added storage_quota_bytes column to families table.")
            except Exception as e:
                logger.error(f"Migration error (families storage_quota_bytes): {str(e)}")

    # 2. Migrate folders table
    if "folders" in table_names:
        columns = [col["name"] for col in inspector.get_columns("folders")]
        if "deleted_at" not in columns:
            try:
                execute_migration_statement(f"ALTER TABLE folders ADD COLUMN deleted_at {datetime_type}")
                execute_migration_statement("CREATE INDEX ix_folders_deleted_at ON folders(deleted_at)")
                logger.info("Migration: Successfully added deleted_at column to folders table.")
            except Exception as e:
                logger.error(f"Migration error (folders deleted_at): {str(e)}")
        if "deletion_batch_id" not in columns:
            try:
                execute_migration_statement("ALTER TABLE folders ADD COLUMN deletion_batch_id VARCHAR(36)")
                execute_migration_statement("CREATE INDEX ix_folders_deletion_batch_id ON folders(deletion_batch_id)")
                logger.info("Migration: Successfully added deletion_batch_id column and index to folders table.")
            except Exception as e:
                logger.error(f"Migration error (folders deletion_batch_id): {str(e)}")
        if "cloud_folder_id" not in columns:
            try:
                execute_migration_statement("ALTER TABLE folders ADD COLUMN cloud_folder_id VARCHAR(255)")
                logger.info("Migration: Successfully added cloud_folder_id column to folders table.")
            except Exception as e:
                logger.error(f"Migration error (folders cloud_folder_id): {str(e)}")
        if "google_drive_folder_id" not in columns:
            try:
                execute_migration_statement("ALTER TABLE folders ADD COLUMN google_drive_folder_id VARCHAR(255)")
                logger.info("Migration: Successfully added google_drive_folder_id column to folders table.")
            except Exception as e:
                logger.error(f"Migration error (folders google_drive_folder_id): {str(e)}")
        # Data migration for folders
        with engine.begin() as conn:
            try:
                conn.execute(text("UPDATE folders SET google_drive_folder_id = cloud_folder_id WHERE google_drive_folder_id IS NULL AND cloud_folder_id IS NOT NULL AND id IN (SELECT f.id FROM folders f JOIN families fam ON f.family_id = fam.id WHERE fam.storage_provider = 'google')"))
            except Exception as e:
                logger.error(f"Migration error (folders data migration): {str(e)}")

    # 3. Migrate files table
    if "files" in table_names:
        columns = [col["name"] for col in inspector.get_columns("files")]
        if "deleted_at" not in columns:
            try:
                execute_migration_statement(f"ALTER TABLE files ADD COLUMN deleted_at {datetime_type}")
                execute_migration_statement("CREATE INDEX ix_files_deleted_at ON files(deleted_at)")
                logger.info("Migration: Successfully added deleted_at column to files table.")
            except Exception as e:
                logger.error(f"Migration error (files deleted_at): {str(e)}")
        if "deletion_batch_id" not in columns:
            try:
                execute_migration_statement("ALTER TABLE files ADD COLUMN deletion_batch_id VARCHAR(36)")
                execute_migration_statement("CREATE INDEX ix_files_deletion_batch_id ON files(deletion_batch_id)")
                logger.info("Migration: Successfully added deletion_batch_id column and index to files table.")
            except Exception as e:
                logger.error(f"Migration error (files deletion_batch_id): {str(e)}")
        if "cloud_file_id" in columns and "file_id" not in columns:
            try:
                execute_migration_statement("ALTER TABLE files RENAME COLUMN cloud_file_id TO file_id")
                logger.info("Migration: Successfully renamed cloud_file_id to file_id.")
            except Exception as e:
                logger.error(f"Migration error (rename cloud_file_id): {str(e)}")
        if "pending_sync" not in columns:
            try:
                execute_migration_statement("ALTER TABLE files ADD COLUMN pending_sync INTEGER NOT NULL DEFAULT 1")
                execute_migration_statement("CREATE INDEX ix_files_pending_sync ON files(pending_sync)")
                logger.info("Migration: Successfully added pending_sync column to files table.")
            except Exception as e:
                logger.error(f"Migration error (files pending_sync): {str(e)}")
        if "pending_sync_at" not in columns:
            try:
                execute_migration_statement(f"ALTER TABLE files ADD COLUMN pending_sync_at {datetime_type}")
                logger.info("Migration: Successfully added pending_sync_at column to files table.")
            except Exception as e:
                logger.error(f"Migration error (files pending_sync_at): {str(e)}")
        if "synced_to" not in columns:
            try:
                execute_migration_statement("ALTER TABLE files ADD COLUMN synced_to VARCHAR(50)")
                logger.info("Migration: Successfully added synced_to column to files table.")
            except Exception as e:
                logger.error(f"Migration error (files synced_to): {str(e)}")
        if "storage_provider" not in columns:
            try:
                execute_migration_statement("ALTER TABLE files ADD COLUMN storage_provider VARCHAR(50) NOT NULL DEFAULT 'local'")
                logger.info("Migration: Successfully added storage_provider column to files table.")
            except Exception as e:
                logger.error(f"Migration error (files storage_provider): {str(e)}")

        if "lock_acquired_at" not in columns:
            try:
                execute_migration_statement(f"ALTER TABLE files ADD COLUMN lock_acquired_at {datetime_type}")
                execute_migration_statement("CREATE INDEX ix_files_lock_acquired_at ON files(lock_acquired_at)")
                logger.info("Migration: Successfully added lock_acquired_at column and index to files table.")
            except Exception as e:
                logger.error(f"Migration error (files lock_acquired_at): {str(e)}")

        if "lock_holder" not in columns:
            try:
                execute_migration_statement("ALTER TABLE files ADD COLUMN lock_holder VARCHAR(255)")
                execute_migration_statement("CREATE INDEX ix_files_lock_holder ON files(lock_holder)")
                logger.info("Migration: Successfully added lock_holder column and index to files table.")
            except Exception as e:
                logger.error(f"Migration error (files lock_holder): {str(e)}")

        if "sync_retry_count" not in columns:
            try:
                execute_migration_statement("ALTER TABLE files ADD COLUMN sync_retry_count INTEGER NOT NULL DEFAULT 0")
                logger.info("Migration: Successfully added sync_retry_count column to files table.")
            except Exception as e:
                logger.error(f"Migration error (files sync_retry_count): {str(e)}")

        # Add local_file_id and cloud_file_id columns
        local_file_id_added = False
        cloud_file_id_added = False
        if "local_file_id" not in columns:
            try:
                execute_migration_statement("ALTER TABLE files ADD COLUMN local_file_id VARCHAR(255)")
                local_file_id_added = True
                logger.info("Migration: Successfully added local_file_id column to files table.")
            except Exception as e:
                logger.error(f"Migration error (files local_file_id): {str(e)}")
        
        if "cloud_file_id" not in columns:
            try:
                execute_migration_statement("ALTER TABLE files ADD COLUMN cloud_file_id VARCHAR(255)")
                cloud_file_id_added = True
                logger.info("Migration: Successfully added cloud_file_id column to files table.")
            except Exception as e:
                logger.error(f"Migration error (files cloud_file_id): {str(e)}")

        if "google_drive_file_id" not in columns:
            try:
                execute_migration_statement("ALTER TABLE files ADD COLUMN google_drive_file_id VARCHAR(255)")
                logger.info("Migration: Successfully added google_drive_file_id column to files table.")
            except Exception as e:
                logger.error(f"Migration error (files google_drive_file_id): {str(e)}")

        if "primary_storage" not in columns:
            try:
                execute_migration_statement("ALTER TABLE files ADD COLUMN primary_storage VARCHAR(50)")
                logger.info("Migration: Successfully added primary_storage column to files table.")
            except Exception as e:
                logger.error(f"Migration error (files primary_storage): {str(e)}")

        if "backup_status" not in columns:
            try:
                execute_migration_statement("ALTER TABLE files ADD COLUMN backup_status VARCHAR(50)")
                logger.info("Migration: Successfully added backup_status column to files table.")
            except Exception as e:
                logger.error(f"Migration error (files backup_status): {str(e)}")

        # Run data migration to populate local_file_id and cloud_file_id
        with engine.begin() as conn:
            try:
                # Migrate local files
                conn.execute(text("UPDATE files SET local_file_id = file_id WHERE (storage_provider = 'local' OR storage_provider IS NULL) AND local_file_id IS NULL"))
                # Migrate cloud files
                conn.execute(text("UPDATE files SET cloud_file_id = file_id WHERE storage_provider IS NOT NULL AND storage_provider != 'local' AND cloud_file_id IS NULL"))
                logger.info("Migration: Successfully completed data migration for files.local_file_id and files.cloud_file_id.")
            except Exception as e:
                logger.error(f"Migration error during files column data migration: {str(e)}")

        # Dual-storage specific data migration
        with engine.begin() as conn:
            try:
                conn.execute(text("UPDATE files SET google_drive_file_id = cloud_file_id WHERE google_drive_file_id IS NULL AND storage_provider = 'google' AND cloud_file_id IS NOT NULL"))
            except Exception as e:
                logger.error(f"Migration error during dual-storage specific data migration: {str(e)}")

        # Add index on pending_sync_at to optimize order_by queries
        try:
            execute_migration_statement("CREATE INDEX ix_files_pending_sync_at ON files(pending_sync_at)")
            logger.info("Migration: Successfully created index ix_files_pending_sync_at.")
        except Exception as e:
            pass

    # 4. Migrate audit_logs table
    if "audit_logs" in table_names:
        columns = [col["name"] for col in inspector.get_columns("audit_logs")]
        if "family_id" not in columns:
            try:
                execute_migration_statement("ALTER TABLE audit_logs ADD COLUMN family_id VARCHAR(36)")
                logger.info("Migration: Successfully added family_id column to audit_logs table.")
            except Exception as e:
                logger.error(f"Migration error (audit_logs family_id): {str(e)}")
        
        try:
            execute_migration_statement("CREATE INDEX ix_audit_logs_family_id ON audit_logs(family_id)")
        except Exception:
            pass
        try:
            execute_migration_statement("CREATE INDEX ix_audit_logs_family_timestamp ON audit_logs(family_id, timestamp)")
        except Exception:
            pass

    # 5. Add performance indexes for cloud file/folder ID lookups
    performance_indexes = [
        ("files", "ix_files_cloud_file_id", "CREATE INDEX ix_files_cloud_file_id ON files(cloud_file_id)"),
        ("files", "ix_files_google_drive_file_id", "CREATE INDEX ix_files_google_drive_file_id ON files(google_drive_file_id)"),
        ("files", "ix_files_local_file_id", "CREATE INDEX ix_files_local_file_id ON files(local_file_id)"),
        ("files", "ix_files_pending_sync_retry", "CREATE INDEX ix_files_pending_sync_retry ON files(pending_sync, sync_retry_count)"),
        ("folders", "ix_folders_cloud_folder_id", "CREATE INDEX ix_folders_cloud_folder_id ON folders(cloud_folder_id)"),
        ("folders", "ix_folders_google_drive_folder_id", "CREATE INDEX ix_folders_google_drive_folder_id ON folders(google_drive_folder_id)"),
    ]
    for table_name, index_name, sql in performance_indexes:
        if table_name in table_names:
            try:
                execute_migration_statement(sql)
                logger.info(f"Migration: Successfully created index {index_name}.")
            except Exception:
                pass  # Index likely already exists
