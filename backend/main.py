import os
import sys
import socket
import threading
import time
import asyncio
from contextlib import asynccontextmanager

# Ensure backend root is in sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Set default global socket timeout of 20 seconds to prevent connection hangs 
# to Google Drive or Supabase DB from blocking FastAPI request threads indefinitely.
socket.setdefaulttimeout(20.0)

if not hasattr(asyncio, "coroutine"):
    asyncio.coroutine = lambda f: f

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.gzip import GZipMiddleware
from database import engine, Base, run_migrations, SessionLocal
from routers import auth, family, storage_config, folders, files, recycle_bin, search, dashboard, share, views
from config import CORS_ORIGINS, IS_DEFAULT_JWT_SECRET, SERVE_FRONTEND
from utils.cleanup import purge_old_recycle_bin_items
from logging_config import logger

# JWT Secret Key Security Validation
APP_ENV = os.getenv("APP_ENV", "production")
if IS_DEFAULT_JWT_SECRET:
    if APP_ENV != "development":
        raise RuntimeError("SECURITY CRITICAL: Default JWT_SECRET is used in a production environment! Server startup aborted.")
    else:
        logger.warning("WARNING: Using default JWT secret key. This is unsafe for production deployment.")

# Storage Config Encryption Key Security Validation
STORAGE_CONFIG_ENCRYPTION_KEY = os.getenv("STORAGE_CONFIG_ENCRYPTION_KEY")
if not STORAGE_CONFIG_ENCRYPTION_KEY:
    logger.warning("WARNING: STORAGE_CONFIG_ENCRYPTION_KEY is not set. Falling back to key derived from JWT_SECRET. This is unsafe for production deployment.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run database tables creation & migrations on startup
    Base.metadata.create_all(bind=engine)
    run_migrations()
    
    # Run sync recovery
    try:
        db = SessionLocal()
        try:
            from storage.storage_manager import StorageManager
            StorageManager().recover_interrupted_syncs(db)
        finally:
            db.close()
    except Exception as recovery_err:
        logger.error(f"Startup Recovery Error: {recovery_err}")

    # Start workers
    start_cleanup_worker()
    start_sync_worker()
    yield

app = FastAPI(
    title="Family Document Management System",
    description="Full-stack family vault powered by Google Drive",
    version="1.0.0",
    lifespan=lifespan
)

def start_cleanup_worker():
    def worker():
        try:
            time.sleep(10)
            while True:
                logger.info("Background retention cleanup worker running...")
                db = SessionLocal()
                try:
                    purge_old_recycle_bin_items(db, retention_days=30)
                except Exception as e:
                    logger.error(f"Error running background retention cleanup: {e}")
                finally:
                    db.close()
                time.sleep(24 * 3600)
        except Exception as startup_err:
            logger.critical(f"CRITICAL: Cleanup worker thread crashed on startup: {startup_err}", exc_info=True)
            
    thread = threading.Thread(target=worker, daemon=True, name="retention-cleanup-worker")
    thread.start()


_sync_manager = None

def start_sync_worker():
    global _sync_manager
    def worker():
        try:
            global _sync_manager
            time.sleep(15)
            from storage.storage_manager import StorageManager
            _sync_manager = StorageManager()
            logger.info("Sync worker started")
            while True:
                from config import SYNC_POLL_INTERVAL_SECONDS, SYNC_BATCH_SIZE
                try:
                    db = SessionLocal()
                    try:
                        from models import File, Family
                        from sqlalchemy import distinct, or_
                        from datetime import datetime, timezone, timedelta
                        
                        now_utc = datetime.now(timezone.utc)
                        timeout_limit = now_utc - timedelta(minutes=10)
                        
                        pending_family_ids = [
                            row[0] for row in db.query(distinct(File.family_id)).filter(
                                File.pending_sync == True,
                                File.deleted_at == None,
                                File.sync_retry_count < 5,
                                or_(
                                    File.lock_acquired_at == None,
                                    File.lock_acquired_at < timeout_limit
                                )
                            ).all()
                        ]
                        if pending_family_ids:
                            families = db.query(Family).filter(Family.id.in_(pending_family_ids)).all()
                            family_configs = {f.id: _sync_manager.get_family_config(f, db) for f in families}
                            result = _sync_manager.sync_pending_files(db, family_configs, batch_size=SYNC_BATCH_SIZE)
                            if result["total"] > 0:
                                logger.info(f"Sync worker completed: {result}")
                    finally:
                        db.close()
                except Exception as e:
                    logger.error(f"Sync worker unhandled loop error: {e}", exc_info=True)
                time.sleep(SYNC_POLL_INTERVAL_SECONDS)
        except Exception as startup_err:
            logger.critical(f"CRITICAL: Sync worker thread crashed on startup: {startup_err}", exc_info=True)
            
    thread = threading.Thread(target=worker, daemon=True, name="storage-sync-worker")
    thread.start()
    logger.info("Sync worker thread launched")

# Startup operations are handled by the lifespan context manager

# GZip Compression — reduces JSON response sizes by ~60-80%
app.add_middleware(GZipMiddleware, minimum_size=500)

# CORS Configuration
# Restricted to CORS_ORIGINS configured in config.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register REST API routers
app.include_router(auth.router)
app.include_router(family.router)
app.include_router(storage_config.router)
app.include_router(folders.router)
app.include_router(files.router)
app.include_router(recycle_bin.router)
app.include_router(search.router)
app.include_router(dashboard.router)
app.include_router(share.router)

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

if SERVE_FRONTEND:
    app.include_router(views.router)
else:
    # A simple health check response for the root domain on Render
    @app.get("/")
    def read_root():
        return {
            "status": "online",
            "message": "FamDoc API Backend is running. Frontend is hosted separately on Vercel."
        }

if SERVE_FRONTEND:
    # Mount Frontend Static Files
    # Path to the frontend directory relative to this file
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    frontend_path = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend"))

    # Ensure the frontend folder exists
    if not os.path.exists(frontend_path):
        os.makedirs(frontend_path)
        os.makedirs(os.path.join(frontend_path, "css"), exist_ok=True)
        os.makedirs(os.path.join(frontend_path, "js"), exist_ok=True)

    # Register static files mounting last so that API routes take precedence
    # Mount /css, /js, and other folders
    app.mount("/css", StaticFiles(directory=os.path.join(frontend_path, "css")), name="css")
    app.mount("/js", StaticFiles(directory=os.path.join(frontend_path, "js")), name="js")

    # Mount the entire frontend directory at the root to serve all HTML files (login.html, dashboard.html, etc.)
    # This must be the last route registered so API routes take precedence.
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

