from cryptography.fernet import Fernet
import json
import os
import base64
import hashlib
from logging_config import logger

# Get or derive the 32-byte url-safe base64-encoded encryption key
FERNET_KEY = os.getenv("STORAGE_CONFIG_ENCRYPTION_KEY")
if not FERNET_KEY:
    jwt_secret = os.getenv("JWT_SECRET", "super-secret-family-document-vault-key-1234567890")
    # Take SHA256 of JWT_SECRET to get 32 bytes, then base64 URL-encode it
    hashed = hashlib.sha256(jwt_secret.encode()).digest()
    FERNET_KEY = base64.urlsafe_b64encode(hashed).decode()

_fernet = Fernet(FERNET_KEY.encode())

def encrypt_config(config: dict) -> str:
    if not config:
        return ""
    try:
        return _fernet.encrypt(json.dumps(config).encode()).decode()
    except Exception as e:
        logger.error(f"Error encrypting storage config: {e}")
        return ""

def decrypt_config(token: str) -> dict:
    if not token:
        return {}
    try:
        # Attempt to decrypt Fernet encrypted string
        return json.loads(_fernet.decrypt(token.encode()).decode())
    except Exception as decrypt_err:
        logger.warning(
            "Decryption of storage config failed. This usually indicates that the STORAGE_CONFIG_ENCRYPTION_KEY "
            "or JWT_SECRET in your environment does not match the key used to encrypt this config in the database. "
            "Please ensure they match across your local and production environments."
        )
        # Fallback to plain JSON in case the configuration is legacy plaintext JSON
        try:
            return json.loads(token)
        except Exception as e:
            logger.error(f"Error parsing storage config as plaintext JSON: {e}")
            return {}
