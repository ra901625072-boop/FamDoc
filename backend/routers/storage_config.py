from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
import auth
import urllib.parse
import time
import requests
from datetime import datetime, timezone
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
    
    # Query all storage accounts for this family
    accounts = db.query(models.StorageAccount).filter(
        models.StorageAccount.family_id == family.id
    ).order_by(models.StorageAccount.priority.asc(), models.StorageAccount.created_at.asc()).all()

    # Self-healing fallback: If family has google storage configured but no storage_accounts rows exist, create it
    if not accounts and family.storage_config:
        g_cfg = family.storage_config.get("google", family.storage_config) if isinstance(family.storage_config, dict) else {}
        if g_cfg.get("client_id") and (g_cfg.get("refresh_token") or g_cfg.get("access_token")):
            acct = models.StorageAccount(
                family_id=family.id,
                provider="google",
                email=g_cfg.get("email") or f"{family.name} (Google)",
                label="Primary Google Drive",
                vault_folder_id=family.vault_folder_id,
                status="active",
                priority=0
            )
            acct.config = g_cfg
            db.add(acct)
            try:
                db.commit()
                db.refresh(acct)
                accounts = [acct]
            except Exception:
                db.rollback()

    active_accounts = [a for a in accounts if a.status == "active"]
    google_configured = len(active_accounts) > 0 or bool(config.get("google", {}).get("refresh_token"))
    provider = family.storage_provider or "local"

    # Compute aggregate storage numbers
    total_cap = 0
    total_used = 0
    for acct in active_accounts:
        if acct.cached_quota_total:
            total_cap += acct.cached_quota_total
        if acct.cached_quota_used:
            total_used += acct.cached_quota_used

    # If no storage account quota is cached or in local mode, default to family quota
    if total_cap == 0:
        total_cap = family.storage_quota_bytes or 524288000

    account_responses = [schemas.StorageAccountResponse.model_validate(acct) for acct in accounts]
    
    first_client_id = active_accounts[0].config.get("client_id") if active_accounts and active_accounts[0].config else config.get("google", {}).get("client_id")
    first_email = active_accounts[0].email if active_accounts else None

    return {
        "storage_provider": provider,
        "is_configured": provider != "local",
        "email": first_email,
        "folder_id": family.vault_folder_id,
        "client_id": first_client_id,
        "google_configured": google_configured,
        "accounts": account_responses,
        "total_capacity_bytes": total_cap,
        "total_used_bytes": total_used,
        "mega_configured": False,
        "storage_mode": "failover",
        "primary_provider": "google"
    }


@router.get("/accounts", response_model=list[schemas.StorageAccountResponse])
def list_storage_accounts(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    accounts = db.query(models.StorageAccount).filter(
        models.StorageAccount.family_id == current_user.family_id
    ).order_by(models.StorageAccount.priority.asc(), models.StorageAccount.created_at.asc()).all()
    return accounts


@router.patch("/accounts/{account_id}", response_model=schemas.StorageAccountResponse)
def update_storage_account(
    account_id: int,
    payload: schemas.StorageAccountUpdate,
    current_user: models.User = Depends(auth.get_admin_user),
    db: Session = Depends(get_db)
):
    acct = db.query(models.StorageAccount).filter(
        models.StorageAccount.id == account_id,
        models.StorageAccount.family_id == current_user.family_id
    ).first()
    if not acct:
        raise HTTPException(status_code=404, detail="Storage account not found")

    if payload.label is not None:
        acct.label = payload.label.strip()
    if payload.priority is not None:
        acct.priority = payload.priority

    db.commit()
    db.refresh(acct)
    return acct


@router.post("/accounts/{account_id}/disconnect")
def disconnect_storage_account(
    account_id: int,
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(auth.get_admin_user),
    db: Session = Depends(get_db)
):
    acct = db.query(models.StorageAccount).filter(
        models.StorageAccount.id == account_id,
        models.StorageAccount.family_id == current_user.family_id
    ).first()
    if not acct:
        raise HTTPException(status_code=404, detail="Storage account not found")

    if acct.status in ("disconnecting", "disconnected"):
        return {"status": acct.status, "message": "Account disconnect already in progress or completed"}

    acct.status = "disconnecting"
    db.commit()

    from storage.storage_manager import StorageManager
    def _run_migration():
        from database import SessionLocal
        session = SessionLocal()
        try:
            StorageManager().migrate_account_files(account_id, session)
        finally:
            session.close()

    background_tasks.add_task(_run_migration)
    return {"status": "disconnecting", "message": "File migration initiated in background"}


@router.delete("/accounts/{account_id}")
def delete_storage_account(
    account_id: int,
    current_user: models.User = Depends(auth.get_admin_user),
    db: Session = Depends(get_db)
):
    acct = db.query(models.StorageAccount).filter(
        models.StorageAccount.id == account_id,
        models.StorageAccount.family_id == current_user.family_id
    ).first()
    if not acct:
        raise HTTPException(status_code=404, detail="Storage account not found")

    file_count = db.query(models.File).filter(models.File.storage_account_id == account_id).count()
    if file_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete storage account while {file_count} files still reference it. Disconnect the account first to migrate files."
        )

    db.delete(acct)
    db.commit()
    return {"status": "success", "message": "Storage account deleted successfully"}


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

    # Temporary state stored on family for OAuth exchange
    current_cfg = family.storage_config or {}
    if isinstance(current_cfg, dict):
        current_cfg["pending_client_id"] = client_id
        current_cfg["pending_client_secret"] = client_secret
        family.storage_config = current_cfg
        db.commit()
    
    state_payload = {
        "family_id": family.id,
        "action": req.action or "connect",
        "client_id": client_id,
        "client_secret": client_secret,
        "exp": int(time.time()) + 600
    }
    from jose import jwt
    from config import JWT_SECRET, JWT_ALGORITHM
    state_token = jwt.encode(state_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    redirect_uri = f"{BACKEND_URL.rstrip('/')}/api/storage/oauth2callback"
    
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email openid",
        "access_type": "offline",
        "prompt": "select_account consent",
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
        action = payload.get("action", "connect")
        state_client_id = payload.get("client_id")
        state_client_secret = payload.get("client_secret")
        if not family_id:
            raise Exception("Invalid state payload")
    except JWTError as e:
        raise HTTPException(status_code=400, detail=f"OAuth state parameter error: {str(e)}")
        
    family = db.query(models.Family).filter(models.Family.id == family_id).first()
    if not family:
        raise HTTPException(status_code=404, detail="Family record not found")
        
    config = family.storage_config or {}
    client_id = state_client_id or config.get("pending_client_id") or config.get("client_id")
    client_secret = state_client_secret or config.get("pending_client_secret") or config.get("client_secret")
    
    if not client_id or not client_secret:
        raise HTTPException(status_code=400, detail="Pending OAuth credentials not found")
        
    redirect_uri = f"{BACKEND_URL.rstrip('/')}/api/storage/oauth2callback"
    
    token_payload = {
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code"
    }
    
    r = requests.post("https://oauth2.googleapis.com/token", data=token_payload, timeout=10)
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

    # Query Google endpoints to get stable external user ID and email
    ext_id = None
    email = None
    quota_limit = None
    quota_usage = None

    try:
        # 1. Fetch user email and ID from standard OAuth userinfo endpoint
        user_res = requests.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10
        )
        if user_res.status_code == 200:
            u_data = user_res.json()
            email = u_data.get("email")
            ext_id = u_data.get("sub") or email

        # 2. Fetch Drive storage quota and fallback user info
        about_res = requests.get(
            "https://www.googleapis.com/drive/v3/about?fields=user,storageQuota",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10
        )
        if about_res.status_code == 200:
            about_data = about_res.json()
            user_info = about_data.get("user", {})
            if not ext_id:
                ext_id = user_info.get("permissionId") or user_info.get("emailAddress")
            if not email:
                email = user_info.get("emailAddress")
            sq = about_data.get("storageQuota", {})
            if sq.get("limit"):
                quota_limit = int(sq["limit"])
            quota_usage = int(sq.get("usage", 0))
    except Exception as user_err:
        print(f"Warning: Could not fetch user details during OAuth callback: {user_err}")
    
    # Check if account already linked to family (by external_account_id or email)
    existing_acct = None
    if ext_id:
        existing_acct = db.query(models.StorageAccount).filter(
            models.StorageAccount.family_id == family.id,
            models.StorageAccount.provider == "google",
            models.StorageAccount.external_account_id == ext_id
        ).first()
    if not existing_acct and email:
        existing_acct = db.query(models.StorageAccount).filter(
            models.StorageAccount.family_id == family.id,
            models.StorageAccount.provider == "google",
            models.StorageAccount.email == email
        ).first()

    try:
        provider = get_storage_provider("google")
        vault_id = provider.ensure_vault_folder(family.id, active_config, db=db)
    except Exception as err:
        return RedirectResponse(url=f"{FRONTEND_URL.rstrip('/')}/?google_auth=error&detail={urllib.parse.quote(str(err))}#/storage")
        
    active_config["vault_folder_id"] = vault_id

    if existing_acct:
        existing_acct.config = active_config
        existing_acct.vault_folder_id = vault_id
        existing_acct.status = "active"
        if email:
            existing_acct.email = email
        if quota_limit is not None:
            existing_acct.cached_quota_total = quota_limit
        if quota_usage is not None:
            existing_acct.cached_quota_used = quota_usage
        existing_acct.quota_checked_at = datetime.now(timezone.utc)
    else:
        account_count = db.query(models.StorageAccount).filter(
            models.StorageAccount.family_id == family.id
        ).count()
        new_acct = models.StorageAccount(
            family_id=family.id,
            provider="google",
            external_account_id=ext_id,
            email=email or f"Google Account #{account_count + 1}",
            label=f"Google Account #{account_count + 1}",
            vault_folder_id=vault_id,
            status="active",
            priority=account_count,
            cached_quota_total=quota_limit,
            cached_quota_used=quota_usage,
            quota_checked_at=datetime.now(timezone.utc)
        )
        new_acct.config = active_config
        db.add(new_acct)

    # Keep family model in sync with primary account
    family.storage_provider = "google"
    family.vault_folder_id = vault_id
    family.storage_config = active_config
    db.commit()
    
    return RedirectResponse(url=f"{FRONTEND_URL.rstrip('/')}/?google_auth=success#/storage")


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
    if provider not in ("local", "google"):
        raise HTTPException(status_code=400, detail="Invalid storage provider")
        
    # Check connected storage accounts
    active_accts = db.query(models.StorageAccount).filter(
        models.StorageAccount.family_id == family.id,
        models.StorageAccount.status == "active"
    ).count()

    if provider == "google" and active_accts == 0 and not family.storage_config:
        raise HTTPException(status_code=400, detail="Google Drive must be connected before setting as active provider")
            
    family.storage_provider = provider
    db.commit()
    
    # Initialize family storage to ensure vault folders exist
    from storage.storage_manager import StorageManager
    StorageManager().initialize_family_storage(family, db)
    
    return get_storage_config(current_user=current_user, db=db)
