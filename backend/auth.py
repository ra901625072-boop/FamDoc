import bcrypt
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status, Header, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from config import JWT_SECRET, JWT_ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        # Set default session token expiration to 100 years (permanent login session)
        expire = datetime.now(timezone.utc) + timedelta(days=365 * 100)
    to_encode.update({
        "exp": expire,
        "scope": "session"
    })
    if "jti" not in to_encode:
        to_encode["jti"] = str(uuid.uuid4())
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def create_file_access_token(file_id: int, user_id: int) -> str:
    # 5-minute single-use/short-lived token for file previews and downloads
    to_encode = {
        "file_id": file_id,
        "user_id": user_id,
        "scope": "file_preview",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
        "jti": str(uuid.uuid4())
    }
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def get_current_user_with_scopes(
    allowed_scopes: list,
    token_header: Optional[str] = None,
    token: Optional[str] = None,
    db: Session = None,
    request: Optional[Request] = None
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    act_token = token_header or token
    if not act_token:
        raise credentials_exception
        
    if act_token.startswith("Bearer "):
        act_token = act_token[7:]
        
    try:
        payload = jwt.decode(act_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        
        jti = payload.get("jti")
        if jti:
            is_revoked = db.query(models.RevokedToken).filter(models.RevokedToken.jti == jti).first()
            if is_revoked:
                raise credentials_exception

        file_id = payload.get("file_id")
        user_id = payload.get("user_id") or payload.get("id")
        scope = payload.get("scope")

        # Fallback to identify legacy tokens or tokens without explicit scope claims
        if scope is None:
            if file_id is not None:
                scope = "file_preview"
            else:
                scope = "session"

        if scope not in allowed_scopes:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions (invalid token scope)"
            )

        if scope == "file_preview" and request is not None:
            file_id_param = request.path_params.get("file_id")
            if file_id_param is not None:
                try:
                    if int(file_id_param) != int(file_id):
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="Token is not authorized for this file ID"
                        )
                except (ValueError, TypeError):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid file ID format"
                    )

        if scope == "session":
            email: str = payload.get("sub")
            if email is None or user_id is None:
                raise credentials_exception
            token_data = schemas.TokenData(email=email, user_id=user_id, scope=scope)
        else:
            token_data = schemas.TokenData(email=None, user_id=user_id, scope=scope, file_id=file_id)
            
    except JWTError:
        raise credentials_exception
        
    from sqlalchemy.orm import joinedload
    user = db.query(models.User).options(
        joinedload(models.User.family_memberships).joinedload(models.FamilyMember.family)
    ).filter(models.User.id == token_data.user_id).first()
    if user is None:
        raise credentials_exception
    return user

def get_current_user(
    token_header: Optional[str] = Depends(oauth2_scheme),
    token: Optional[str] = None,
    db: Session = Depends(get_db)
) -> models.User:
    return get_current_user_with_scopes(["session"], token_header, token, db)

def get_current_user_or_file_preview(
    request: Request,
    token_header: Optional[str] = Depends(oauth2_scheme),
    token: Optional[str] = None,
    db: Session = Depends(get_db)
) -> models.User:
    if not token and request and hasattr(request, "query_params"):
        token = request.query_params.get("token")
    return get_current_user_with_scopes(["session", "file_preview"], token_header, token, db, request)

def get_admin_user(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> models.User:
    # If the user is registered as an admin and has not set up/joined a family yet,
    # allow them to proceed (necessary for initial family setup).
    if current_user.role == "admin" and current_user.family_id is None:
        return current_user

    membership = db.query(models.FamilyMember).filter(
        models.FamilyMember.family_id == current_user.family_id,
        models.FamilyMember.user_id == current_user.id
    ).first()
    if not membership or membership.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation restricted to family administrator"
        )
    return current_user

def verify_resource_access(
    db_model,
    resource_id: int,
    family_id: str,
    db: Session,
    include_deleted: bool = False,
):
    if family_id is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{db_model.__name__} not found"
        )
        
    query = db.query(db_model).filter(
        db_model.id == resource_id,
        db_model.family_id == family_id,
    )

    if not include_deleted and hasattr(db_model, "deleted_at"):
        query = query.filter(db_model.deleted_at.is_(None))

    resource = query.first()

    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{db_model.__name__} not found"
        )

    return resource
