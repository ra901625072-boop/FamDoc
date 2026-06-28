import os
from dotenv import load_dotenv

# Load env variables
load_dotenv()

# App Settings
RENDER_EXTERNAL_URL = os.getenv("RENDER_EXTERNAL_URL")
BACKEND_URL = os.getenv("BACKEND_URL", RENDER_EXTERNAL_URL or "http://localhost:8000")
FRONTEND_URL = os.getenv("FRONTEND_URL", RENDER_EXTERNAL_URL or "http://localhost:8000")

# CORS Origins Setup
cors_origins_raw = os.getenv("CORS_ORIGINS", "")
if cors_origins_raw:
    CORS_ORIGINS = [origin.strip() for origin in cors_origins_raw.split(",") if origin.strip()]
else:
    CORS_ORIGINS = [FRONTEND_URL, "http://localhost:8000", "http://127.0.0.1:8000", "http://localhost:5173", "http://127.0.0.1:5173"]

# Database Settings
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./family_documents.db")

# Fix Render PostgreSQL URL (SQLAlchemy requires postgresql:// instead of postgres://)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# JWT Authentication Settings
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-family-document-vault-key-1234567890")
IS_DEFAULT_JWT_SECRET = JWT_SECRET == "super-secret-family-document-vault-key-1234567890"
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")) # Default 24 hours

# Google Storage Settings
GOOGLE_SERVICE_ACCOUNT_FILE = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE", "service-account.json")
GOOGLE_FOLDER_ID = os.getenv("GOOGLE_FOLDER_ID", "")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")


# Mega Storage Settings
MEGA_EMAIL = os.getenv("MEGA_EMAIL", "")
MEGA_PASSWORD = os.getenv("MEGA_PASSWORD", "")

# VirusTotal Scanner Settings
VIRUSTOTAL_API_KEY = os.getenv("VIRUSTOTAL_API_KEY", "")

# Storage Sync Worker Settings
SYNC_POLL_INTERVAL_SECONDS = int(os.getenv("SYNC_POLL_INTERVAL_SECONDS", "60"))
SYNC_BATCH_SIZE = int(os.getenv("SYNC_BATCH_SIZE", "50"))
HEALTH_CHECK_CACHE_TTL = int(os.getenv("HEALTH_CHECK_CACHE_TTL", "30"))
