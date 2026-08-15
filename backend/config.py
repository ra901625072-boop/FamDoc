import os
from dotenv import load_dotenv

# Load env variables
load_dotenv()

# App Settings
RENDER_EXTERNAL_URL = os.getenv("RENDER_EXTERNAL_URL")
BACKEND_URL = os.getenv("BACKEND_URL", RENDER_EXTERNAL_URL or "http://localhost:8000")
FRONTEND_URL = os.getenv("FRONTEND_URL", RENDER_EXTERNAL_URL or "http://localhost:8000")

# Serve Frontend settings (useful for decoupling frontend on Vercel and backend on Render)
SERVE_FRONTEND = os.getenv("SERVE_FRONTEND", "true").lower() == "true"
if os.getenv("RENDER") or RENDER_EXTERNAL_URL:
    # Disable serving frontend by default on Render, unless explicitly set to true
    SERVE_FRONTEND = os.getenv("SERVE_FRONTEND", "false").lower() == "true"

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


# VirusTotal Scanner Settings
VIRUSTOTAL_API_KEY = os.getenv("VIRUSTOTAL_API_KEY", "")

# Storage Sync Worker Settings
SYNC_POLL_INTERVAL_SECONDS = int(os.getenv("SYNC_POLL_INTERVAL_SECONDS", "60"))
SYNC_BATCH_SIZE = int(os.getenv("SYNC_BATCH_SIZE", "50"))
HEALTH_CHECK_CACHE_TTL = int(os.getenv("HEALTH_CHECK_CACHE_TTL", "30"))

# Cache Settings (configurable via environment variables)
DASHBOARD_CACHE_TTL = int(os.getenv("DASHBOARD_CACHE_TTL", "30"))
FOLDER_LISTING_CACHE_TTL = int(os.getenv("FOLDER_LISTING_CACHE_TTL", "15"))
SEARCH_CACHE_TTL = int(os.getenv("SEARCH_CACHE_TTL", "10"))

# SMTP Email Configuration for OTP Verification
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "")
SMTP_TLS = os.getenv("SMTP_TLS", "true").lower() == "true"
SMTP_SSL = os.getenv("SMTP_SSL", "false").lower() == "true"

# Resend Email Configuration for OTP Verification
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")


