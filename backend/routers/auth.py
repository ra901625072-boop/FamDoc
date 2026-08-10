from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
import auth

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

from utils.rate_limiter import check_rate_limit as verify_rate_limit
from utils.ip import get_client_ip

def check_rate_limit(ip: str):
    if verify_rate_limit(f"auth_login:{ip}", max_requests=5, window_seconds=600):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many family login attempts. Please try again in 10 minutes."
        )

@router.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: schemas.UserRegister, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email is already registered."
        )

    existing_username = db.query(models.User).filter(models.User.username == user_in.username).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this username is already registered."
        )

    # Hash the password
    hashed_pwd = auth.get_password_hash(user_in.password)
    
    # Create new user as admin
    new_user = models.User(
        username=user_in.username,
        email=user_in.email,
        password_hash=hashed_pwd,
        role="admin"
    )
    
    db.add(new_user)
    db.flush()

    # Automatically initialize a family vault for the newly registered admin
    import secrets
    import string
    import hashlib
    
    # Generate an ID for the family
    family_id = "".join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(12))
    
    # Generate family secret code
    alphabet = string.ascii_uppercase + string.digits
    plaintext_code = "".join(secrets.choice(alphabet) for _ in range(8))
    hashed_code = auth.get_password_hash(plaintext_code)
    sha256_hash = hashlib.sha256(plaintext_code.encode("utf-8")).hexdigest()
    
    new_family = models.Family(
        id=family_id,
        name=f"{new_user.username}'s Family",
        admin_id=new_user.id,
        secret_code_hash=hashed_code,
        secret_code_sha256=sha256_hash,
        max_members=10,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7)
    )
    db.add(new_family)
    db.flush()
    
    # Auto-initialize storage from .env defaults if no personal config is provided
    try:
        from storage.storage_manager import StorageManager
        manager = StorageManager()
        manager.initialize_family_storage(new_family, db)
    except Exception as storage_err:
        # Non-fatal: storage will be lazily initialized on first file operation
        print(f"Info: Could not auto-initialize storage for new family {family_id}: {str(storage_err)}")
    
    # Add the admin as a family member
    admin_member = models.FamilyMember(
        family_id=family_id,
        user_id=new_user.id,
        role="admin"
    )
    db.add(admin_member)
    
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=schemas.Token)
def login(request: Request, credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    ip = get_client_ip(request)
    check_rate_limit(ip)
    user = db.query(models.User).filter(models.User.email == credentials.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.password_hash is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account requires password setup. Please contact your family administrator.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not auth.verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = auth.create_access_token(
        data={
            "sub": user.email,
            "id": user.id,
            "role": user.role,
        }
    )
    from jose import jwt
    try:
        payload = jwt.decode(access_token, auth.JWT_SECRET, algorithms=[auth.JWT_ALGORITHM])
        jti = payload.get("jti")
        if jti:
            user.current_token_jti = jti
            db.commit()
    except Exception:
        pass
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/family-login", response_model=schemas.Token)
def family_login(request: Request, login_in: schemas.FamilyLogin, db: Session = Depends(get_db)):
    # Rate Limiting: 5 attempts / 10 min per IP
    ip = get_client_ip(request)
    check_rate_limit(ip)
    
    # 1. All fields filled (Handled by Pydantic schema validation)
    # 2. Hash the entered code -> look up matching family record
    import hashlib
    code_to_check = login_in.secret_code.replace("-", "").upper()
    sha256_hash = hashlib.sha256(code_to_check.encode("utf-8")).hexdigest()
    
    # Try fast O(1) indexed lookup
    matched_family = db.query(models.Family).filter(models.Family.secret_code_sha256 == sha256_hash).first()
    
    # Fallback to slow lookup for legacy records and auto-upgrade them
    if not matched_family:
        legacy_families = db.query(models.Family).filter(models.Family.secret_code_sha256 == None).all()
        for f in legacy_families:
            if auth.verify_password(code_to_check, f.secret_code_hash):
                f.secret_code_sha256 = sha256_hash
                db.commit()
                matched_family = f
                break
            
    if not matched_family:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid secret code. Please check with your family admin."
        )

    # 3. Check code has not expired
    if matched_family.expires_at:
        expires_at_aware = matched_family.expires_at.replace(tzinfo=timezone.utc) if matched_family.expires_at.tzinfo is None else matched_family.expires_at
        if expires_at_aware < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="This family code has expired. Ask your admin to generate a new one."
            )

    # 4. Check current member count < max_members
    current_members = db.query(models.FamilyMember).filter(models.FamilyMember.family_id == matched_family.id).count()
    if current_members >= matched_family.max_members:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This family is full. Contact your family admin."
        )

    # 5. Check this email is not already a member of this family
    existing_user = db.query(models.User).filter(models.User.email == login_in.email).first()
    if existing_user:
        # Verify password for the existing user
        if not auth.verify_password(login_in.password, existing_user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password for the existing account."
            )
            
        # Verify they aren't already associated with any family group
        if existing_user.family_id is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This account is already associated with a family group."
            )
        user = existing_user
    else:
        # Check if username is already taken by someone else
        existing_username = db.query(models.User).filter(models.User.username == login_in.username).first()
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this username is already registered. Please choose a different name."
            )
        # Create new user record
        user = models.User(
            username=login_in.username,
            email=login_in.email,
            password_hash=auth.get_password_hash(login_in.password),
            role="member"
        )
        db.add(user)
        db.flush() # flush to get user.id

    # Insert into family_members
    new_member = models.FamilyMember(
        family_id=matched_family.id,
        user_id=user.id,
        role="member"
    )
    db.add(new_member)

    # Note: We removed the immediate expiration of the code so it remains reusable
    # for other family members until the 7-day expires_at limit or capacity is reached.

    db.commit()
    db.refresh(user)

    # Generate token
    access_token = auth.create_access_token(
        data={
            "sub": user.email,
            "id": user.id,
            "role": user.role,
        }
    )
    from jose import jwt
    try:
        payload = jwt.decode(access_token, auth.JWT_SECRET, algorithms=[auth.JWT_ALGORITHM])
        jti = payload.get("jti")
        if jti:
            user.current_token_jti = jti
            db.commit()
    except Exception:
        pass
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@router.put("/profile", response_model=schemas.UserResponse)
def update_profile(
    profile_in: schemas.UserProfileUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if profile_in.username is not None:
        # Check conflicts
        existing_user = db.query(models.User).filter(
            models.User.username == profile_in.username,
            models.User.id != current_user.id
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This username is already taken."
            )
        current_user.username = profile_in.username

    if profile_in.password is not None:
        current_user.password_hash = auth.get_password_hash(profile_in.password)

    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/logout")
def logout(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
    token: str = Depends(auth.oauth2_scheme)
):
    from jose import jwt
    try:
        payload = jwt.decode(token, auth.JWT_SECRET, algorithms=[auth.JWT_ALGORITHM])
        jti = payload.get("jti")
        if jti:
            revoked = models.RevokedToken(jti=jti)
            db.add(revoked)
            if current_user.current_token_jti == jti:
                current_user.current_token_jti = None
            db.commit()
    except Exception:
        pass
    return {"message": "Logged out successfully"}
