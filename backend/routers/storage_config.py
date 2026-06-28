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
    
    email = config.get("email") if family.storage_provider == "mega" else None
    folder_id = config.get("folder_id") if family.storage_provider == "google" else None
    client_id = config.get("client_id") if family.storage_provider == "google" else None
    
    return {
        "storage_provider": family.storage_provider,
        "is_configured": family.storage_provider is not None,
        "email": email,
        "folder_id": folder_id,
        "client_id": client_id
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
        "scope": "https://www.googleapis.com/auth/drive",
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
        return RedirectResponse(url=f"{FRONTEND_URL.rstrip('/')}/storage-config.html?google_auth=error&detail={urllib.parse.quote(r.text)}")
        
    res = r.json()
    access_token = res.get("access_token")
    refresh_token = res.get("refresh_token")
    expires_in = res.get("expires_in", 3600)
    
    if not refresh_token:
        refresh_token = config.get("refresh_token")
        if not refresh_token:
            return RedirectResponse(
                url=f"{FRONTEND_URL.rstrip('/')}/storage-config.html?google_auth=error&detail=" + 
                    urllib.parse.quote("No refresh token returned. Please remove application access from your Google account settings and try again.")
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
        vault_id = provider.ensure_vault_folder(family.id, active_config)
    except Exception as err:
        return RedirectResponse(url=f"{FRONTEND_URL.rstrip('/')}/storage-config.html?google_auth=error&detail={urllib.parse.quote(str(err))}")
        
    family.storage_provider = "google"
    family.storage_config = active_config
    family.vault_folder_id = vault_id
    db.commit()
    
    return RedirectResponse(url=f"{FRONTEND_URL.rstrip('/')}/storage-config.html?google_auth=success")



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
    family.storage_provider = "mega"
    family.storage_config = config
    family.vault_folder_id = vault_id
    db.commit()
    
    return {
        "storage_provider": "mega",
        "is_configured": True,
        "email": setup_in.email
    }


