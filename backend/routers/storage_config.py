from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
import auth
import urllib.parse
from config import BACKEND_URL, FRONTEND_URL
from storage import get_storage_provider

router = APIRouter(prefix="/api/storage", tags=["Storage Configuration"])

@router.get("/config", response_model=schemas.StorageConfigResponse)
def get_storage_config(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    family = db.query(models.Family).filter(models.Family.id == current_user.family_id).first()
    if not family:
        raise HTTPException(status_code=404, detail="Family record not found")
        
    from storage.storage_manager import StorageManager
    manager = StorageManager()
    config = manager.get_family_config(family, db)
    
    google_config = config.get("google", {})
    mega_config = config.get("mega", {})
    
    google_configured = bool(google_config.get("client_id") and google_config.get("refresh_token"))
    mega_configured = bool(mega_config.get("email") and mega_config.get("password"))
    
    provider = family.storage_provider or "local"
    
    return {
        "storage_provider": provider,
        "is_configured": provider != "local",
        "email": mega_config.get("email"),
        "folder_id": google_config.get("folder_id"),
        "client_id": google_config.get("client_id"),
        "google_configured": google_configured,
        "mega_configured": mega_configured,
        "storage_mode": config.get("storage_mode", "failover"),
        "primary_provider": config.get("primary_provider", "google")
    }


@router.post("/oauth/url")
def get_oauth_url(
    req: schemas.OAuthUrlRequest,
    current_user: models.User = Depends(auth.get_admin_user),
    db: Session = Depends(get_db)
):
    family = db.query(models.Family).filter(models.Family.id == current_user.family_id).first()
    if not family:
        raise HTTPException(status_code=404, detail="Family record not found")
        
    client_id = req.client_id
    client_secret = req.client_secret
    
    from config import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
    if not client_id and GOOGLE_CLIENT_ID:
        client_id = GOOGLE_CLIENT_ID
    if not client_secret and GOOGLE_CLIENT_SECRET:
        client_secret = GOOGLE_CLIENT_SECRET
        
    if not client_id or not client_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google OAuth Client ID and Client Secret must be configured in environment or provided in request"
        )
        
    family.storage_config = {
        "client_id": client_id,
        "client_secret": client_secret,
        "status": "pending_auth",
        "family_id": family.id
    }
    db.commit()
    
    import time
    state_payload = {
        "family_id": family.id,
        "exp": int(time.time()) + 600
    }
    from jose import jwt
    from config import JWT_SECRET, JWT_ALGORITHM
    state_token = jwt.encode(state_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    from config import BACKEND_URL
    redirect_uri = f"{BACKEND_URL.rstrip('/')}/api/storage/oauth2callback"
    
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "https://www.googleapis.com/auth/drive.file",
        "access_type": "offline",
        "prompt": "consent",
        "state": state_token
    }
    auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)
    return {"url": auth_url}


@router.get("/oauth2callback")
def oauth2callback(
    code: str,
    state: str,
    db: Session = Depends(get_db)
):
    from jose import jwt, JWTError
    from config import JWT_SECRET, JWT_ALGORITHM, FRONTEND_URL
    try:
        payload = jwt.decode(state, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        family_id = payload.get("family_id")
        if not family_id:
            raise Exception("Invalid state payload")
    except JWTError as e:
        raise HTTPException(status_code=400, detail=f"OAuth state parameter error: {str(e)}")
        
    family = db.query(models.Family).filter(models.Family.id == family_id).first()
    if not family:
        raise HTTPException(status_code=404, detail="Family record not found")
        
    config = family.storage_config or {}
    client_id = config.get("client_id")
    client_secret = config.get("client_secret")
    
    if not client_id or not client_secret:
        raise HTTPException(status_code=400, detail="Pending OAuth credentials not found")
        
    import requests
    import time
    from config import BACKEND_URL
    redirect_uri = f"{BACKEND_URL.rstrip('/')}/api/storage/oauth2callback"
    
    payload = {
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code"
    }
    
    r = requests.post("https://oauth2.googleapis.com/token", data=payload)
    if r.status_code != 200:
        return RedirectResponse(url=f"{FRONTEND_URL.rstrip('/')}/?google_auth=error&detail={urllib.parse.quote(r.text)}#/storage")
        
    res = r.json()
    access_token = res.get("access_token")
    refresh_token = res.get("refresh_token")
    expires_in = res.get("expires_in", 3600)
    
    if not refresh_token:
        refresh_token = config.get("refresh_token")
        if not refresh_token:
            return RedirectResponse(
                url=f"{FRONTEND_URL.rstrip('/')}/?google_auth=error&detail=" + 
                    urllib.parse.quote("No refresh token returned. Please remove application access from your Google account settings and try again.") +
                    "#/storage"
            )
            
    active_config = {
        "client_id": client_id,
        "client_secret": client_secret,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_at": int(time.time()) + expires_in,
        "family_id": family.id
    }
    
    try:
        provider = get_storage_provider("google")
        vault_id = provider.ensure_vault_folder(family.id, active_config, db=db)
    except Exception as err:
        return RedirectResponse(url=f"{FRONTEND_URL.rstrip('/')}/?google_auth=error&detail={urllib.parse.quote(str(err))}#/storage")
        
    config_data = family.storage_config or {}
    migrated_config = {}
    if "client_id" in config_data or "refresh_token" in config_data:
        migrated_config["google"] = {k: v for k, v in config_data.items() if k not in ("google", "mega", "storage_mode", "primary_provider")}
    elif "google" in config_data:
        migrated_config["google"] = config_data["google"].copy()
    else:
        migrated_config["google"] = {}
        
    if "email" in config_data:
        migrated_config["mega"] = {k: v for k, v in config_data.items() if k not in ("google", "mega", "storage_mode", "primary_provider")}
    elif "mega" in config_data:
        migrated_config["mega"] = config_data["mega"].copy()
    else:
        migrated_config["mega"] = {}
        
    for k, v in config_data.items():
        if k not in ("google", "mega", "storage_mode", "primary_provider", "client_id", "client_secret", "access_token", "refresh_token", "expires_at", "email", "password"):
            migrated_config[k] = v

    migrated_config["google"] = active_config
    migrated_config["google_vault_folder_id"] = vault_id
    
    family.storage_config = migrated_config
    if family.storage_provider not in ("mega", "dual"):
        family.storage_provider = "google"
        family.vault_folder_id = vault_id
    db.commit()
    
    return RedirectResponse(url=f"{FRONTEND_URL.rstrip('/')}/?google_auth=success#/storage")



@router.post("/config/mega", response_model=schemas.StorageConfigResponse)
def setup_mega(
    setup_in: schemas.StorageSetupMega,
    current_user: models.User = Depends(auth.get_admin_user),
    db: Session = Depends(get_db)
):
    family = db.query(models.Family).filter(models.Family.id == current_user.family_id).first()
    if not family:
        raise HTTPException(status_code=404, detail="Family record not found")

    config = {
        "email": setup_in.email,
        "password": setup_in.password
    }

    try:
        provider = get_storage_provider("mega")
        # 1. Verify login works
        provider.verify_credentials(config)
        # 2. Ensure vault folder exists
        vault_id = provider.ensure_vault_folder(family.id, config)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Mega Configuration Error: {str(e)}"
        )

    # Save to database
    config_data = family.storage_config or {}
    migrated_config = {}
    if "client_id" in config_data or "refresh_token" in config_data:
        migrated_config["google"] = {k: v for k, v in config_data.items() if k not in ("google", "mega", "storage_mode", "primary_provider")}
    elif "google" in config_data:
        migrated_config["google"] = config_data["google"].copy()
    else:
        migrated_config["google"] = {}
        
    if "email" in config_data:
        migrated_config["mega"] = {k: v for k, v in config_data.items() if k not in ("google", "mega", "storage_mode", "primary_provider")}
    elif "mega" in config_data:
        migrated_config["mega"] = config_data["mega"].copy()
    else:
        migrated_config["mega"] = {}
        
    for k, v in config_data.items():
        if k not in ("google", "mega", "storage_mode", "primary_provider", "client_id", "client_secret", "access_token", "refresh_token", "expires_at", "email", "password"):
            migrated_config[k] = v

    migrated_config["mega"] = config
    migrated_config["mega_vault_folder_id"] = vault_id
    
    family.storage_config = migrated_config
    if family.storage_provider not in ("google", "dual"):
        family.storage_provider = "mega"
        family.vault_folder_id = vault_id
    db.commit()
    
    return get_storage_config(current_user=current_user, db=db)


@router.post("/config/mode", response_model=schemas.StorageConfigResponse)
def update_storage_mode(
    req: schemas.StorageModeUpdate,
    current_user: models.User = Depends(auth.get_admin_user),
    db: Session = Depends(get_db)
):
    family = db.query(models.Family).filter(models.Family.id == current_user.family_id).first()
    if not family:
        raise HTTPException(status_code=404, detail="Family record not found")
        
    provider = req.storage_provider
    if provider not in ("local", "google", "mega", "dual"):
        raise HTTPException(status_code=400, detail="Invalid storage provider")
        
    # Verify requested provider is configured
    config_data = family.storage_config or {}
    
    # Handle legacy flat configs
    google_configured = "google" in config_data or "client_id" in config_data
    mega_configured = "mega" in config_data or "email" in config_data
    
    if provider == "google" and not google_configured:
        raise HTTPException(status_code=400, detail="Google Drive must be connected before setting as active provider")
    if provider == "mega" and not mega_configured:
        raise HTTPException(status_code=400, detail="MEGA must be configured before setting as active provider")
    if provider == "dual":
        if not google_configured or not mega_configured:
            raise HTTPException(status_code=400, detail="Both Google Drive and MEGA must be connected before enabling Dual Mode")
            
    family.storage_provider = provider
    
    # Merge existing configs
    migrated_config = {}
    if "client_id" in config_data or "refresh_token" in config_data:
        migrated_config["google"] = {k: v for k, v in config_data.items() if k not in ("google", "mega", "storage_mode", "primary_provider")}
    elif "google" in config_data:
        migrated_config["google"] = config_data["google"].copy()
    else:
        migrated_config["google"] = {}
        
    if "email" in config_data:
        migrated_config["mega"] = {k: v for k, v in config_data.items() if k not in ("google", "mega", "storage_mode", "primary_provider")}
    elif "mega" in config_data:
        migrated_config["mega"] = config_data["mega"].copy()
    else:
        migrated_config["mega"] = {}
        
    for k, v in config_data.items():
        if k not in ("google", "mega", "storage_mode", "primary_provider", "client_id", "client_secret", "access_token", "refresh_token", "expires_at", "email", "password"):
            migrated_config[k] = v
            
    migrated_config["storage_mode"] = req.storage_mode or "failover"
    migrated_config["primary_provider"] = req.primary_provider or "google"
    
    # Synchronize vault_folder_id in family model based on selected/primary provider
    if provider == "google":
        family.vault_folder_id = migrated_config.get("google_vault_folder_id")
    elif provider == "mega":
        family.vault_folder_id = migrated_config.get("mega_vault_folder_id")
    elif provider == "dual":
        primary = req.primary_provider or "google"
        if primary == "google":
            family.vault_folder_id = migrated_config.get("google_vault_folder_id")
        else:
            family.vault_folder_id = migrated_config.get("mega_vault_folder_id")
            
    family.storage_config = migrated_config
    db.commit()
    
    # Initialize family storage to ensure vault folders exist
    from storage.storage_manager import StorageManager
    StorageManager().initialize_family_storage(family, db)
    
    return get_storage_config(current_user=current_user, db=db)


