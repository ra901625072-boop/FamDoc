import bcrypt
import uuid
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status, Header
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
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    if "jti" not in to_encode:
        to_encode["jti"] = str(uuid.uuid4())
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def create_file_access_token(file_id: int, user_id: int) -> str:
    # 5-minute single-use/short-lived token for file previews and downloads
    to_encode = {
        "file_id": file_id,
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(minutes=5),
        "jti": str(uuid.uuid4())
    }
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def get_current_user(
    token_header: Optional[str] = Depends(oauth2_scheme),
    token: Optional[str] = None,
    db: Session = Depends(get_db)
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    act_token = token_header or token
    if not act_token:
        raise credentials_exception
        
    try:
        payload = jwt.decode(act_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        
        jti = payload.get("jti")
        if jti:
            is_revoked = db.query(models.RevokedToken).filter(models.RevokedToken.jti == jti).first()
            if is_revoked:
                raise credentials_exception

        file_id = payload.get("file_id")
        user_id = payload.get("user_id")
        
        if file_id is not None:
            # It's a scoped file access token
            token_data = schemas.TokenData(email=None, user_id=user_id)
        else:
            email: str = payload.get("sub")
            user_id: int = payload.get("id")
            if email is None or user_id is None:
                raise credentials_exception
            token_data = schemas.TokenData(email=email, user_id=user_id)
    except JWTError:
        raise credentials_exception
        
    user = db.query(models.User).filter(models.User.id == token_data.user_id).first()
    if user is None:
        raise credentials_exception
    return user


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
