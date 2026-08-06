import os
import asyncio
if not hasattr(asyncio, "coroutine"):
    asyncio.coroutine = lambda f: f
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import engine, Base, run_migrations
import models
from routers import auth, family, storage_config, folders, files, recycle_bin, search, dashboard, share, views
from config import CORS_ORIGINS, IS_DEFAULT_JWT_SECRET, SERVE_FRONTEND

from logging_config import logger

# Create database tables
Base.metadata.create_all(bind=engine)
run_migrations()

# JWT Secret Key Security Validation
APP_ENV = os.getenv("APP_ENV", "production")
if IS_DEFAULT_JWT_SECRET:
    if APP_ENV != "development":
        raise RuntimeError("SECURITY CRITICAL: Default JWT_SECRET is used in a production environment! Server startup aborted.")
    else:
        logger.warning("WARNING: Using default JWT secret key. This is unsafe for production deployment.")

app = FastAPI(
    title="Family Document Management System",
    description="Full-stack family vault powered by Google Drive or Mega storage",
    version="1.0.0"
)

import threading
import time
from utils.cleanup import purge_old_recycle_bin_items
from database import SessionLocal

def start_cleanup_worker():
    def worker():
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
            
    thread = threading.Thread(target=worker, daemon=True)
    thread.start()


_sync_manager = None

def start_sync_worker():
    global _sync_manager
    def worker():
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
                    from sqlalchemy import distinct
                    
                    pending_family_ids = [
                        row[0] for row in db.query(distinct(File.family_id)).filter(
                            File.pending_sync == True, File.deleted_at == None
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
                logger.error(f"Sync worker unhandled error: {e}", exc_info=True)
            time.sleep(SYNC_POLL_INTERVAL_SECONDS)
    thread = threading.Thread(target=worker, daemon=True, name="storage-sync-worker")
    thread.start()
    logger.info("Sync worker thread launched")

@app.on_event("startup")
def on_startup():
    start_cleanup_worker()
    start_sync_worker()

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
