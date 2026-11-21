import secrets
import string
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models
import schemas
import auth

router = APIRouter(prefix="/api/family", tags=["Family"])

def generate_family_secret_code(family_name: str = "", max_members: int = 10) -> str:
    # First two letters from family name
    clean_letters = "".join(c for c in (family_name or "").strip() if c.isalpha()).upper()
    if len(clean_letters) >= 2:
        name_part = clean_letters[:2]
    elif len(clean_letters) == 1:
        name_part = f"{clean_letters}X"
    else:
        name_part = "FD"

    # Next two digits: number of family members (e.g. 10 -> "10", 4 -> "04")
    try:
        num = int(max_members)
        members_part = f"{num:02d}"[-2:]
    except Exception:
        members_part = "10"

    # Last 4 characters: random alphanumeric
    alphabet = string.ascii_uppercase + string.digits
    random_part = "".join(secrets.choice(alphabet) for _ in range(4))

    return f"{name_part}{members_part}{random_part}"

@router.post("/setup", response_model=schemas.FamilySetupResponse)
def setup_family(
    setup_data: schemas.FamilySetup,
    current_user: models.User = Depends(auth.get_admin_user),
    db: Session = Depends(get_db)
):
    # Ensure this admin doesn't already have a family (optional, but good practice)
    existing_family = db.query(models.Family).filter(models.Family.admin_id == current_user.id).first()
    if existing_family:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already administer a family."
        )

    # Generate an ID for the family
    family_id = "".join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(12))

    import hashlib
    plaintext_code = generate_family_secret_code(setup_data.name, setup_data.max_members)
    # Format code with hyphen for better UX (e.g. XXXX-XXXX)
    formatted_plaintext = f"{plaintext_code[:4]}-{plaintext_code[4:]}"
    hashed_code = auth.get_password_hash(plaintext_code)
    sha256_hash = hashlib.sha256(plaintext_code.encode("utf-8")).hexdigest()

    new_family = models.Family(
        id=family_id,
        name=setup_data.name,
        admin_id=current_user.id,
        secret_code_hash=hashed_code,
        secret_code_sha256=sha256_hash,
        max_members=setup_data.max_members,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=1)
    )
    db.add(new_family)
    db.flush()

    # Add the admin as a family member as well
    admin_member = models.FamilyMember(
        family_id=family_id,
        user_id=current_user.id,
        role="admin"
    )
    db.add(admin_member)
    db.commit()

    return schemas.FamilySetupResponse(
        family_id=family_id,
        name=setup_data.name,
        secret_code=formatted_plaintext,
        max_members=setup_data.max_members,
        expires_at=new_family.expires_at
    )

@router.get("/members", response_model=List[schemas.FamilyMemberResponse])
def get_family_members(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Find which family the current user belongs to
    membership = db.query(models.FamilyMember).filter(models.FamilyMember.user_id == current_user.id).first()
    if not membership:
        raise HTTPException(status_code=404, detail="You do not belong to any family.")

    members = db.query(models.FamilyMember).filter(models.FamilyMember.family_id == membership.family_id).all()
    
    # Query active storage accounts for this family to map member contributions
    storage_accounts = db.query(models.StorageAccount).filter(
        models.StorageAccount.family_id == membership.family_id,
        models.StorageAccount.status == "active"
    ).all()

    user_storage_map = {}
    for acct in storage_accounts:
        uid = acct.user_id
        if not uid and acct.email:
            matched_member = db.query(models.FamilyMember).filter(
                models.FamilyMember.family_id == membership.family_id
            ).join(models.User).filter(
                models.User.email == acct.email
            ).first()
            if matched_member and matched_member.user:
                uid = matched_member.user_id
                acct.user_id = matched_member.user_id
                try:
                    db.commit()
                except Exception:
                    pass
        if uid:
            if uid not in user_storage_map:
                user_storage_map[uid] = {"capacity": 0, "email": acct.email}
            user_storage_map[uid]["capacity"] += (acct.cached_quota_total or (15 * 1024 * 1024 * 1024))
            if acct.email:
                user_storage_map[uid]["email"] = acct.email

    member_responses = []
    for m in members:
        resp = schemas.FamilyMemberResponse.model_validate(m)
        st_info = user_storage_map.get(m.user_id)
        if st_info:
            resp.storage_connected = True
            resp.storage_contributed_bytes = st_info["capacity"]
            resp.storage_account_email = st_info.get("email")
        else:
            resp.storage_connected = False
            resp.storage_contributed_bytes = 0
            resp.storage_account_email = None
        member_responses.append(resp)

    return member_responses

@router.delete("/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_family_member(
    user_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Only admins can remove members
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can remove family members.")

    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Admins cannot remove themselves. Assign a new admin first.")

    membership = db.query(models.FamilyMember).filter(
        models.FamilyMember.user_id == user_id,
        models.FamilyMember.family_id == current_user.family_id
    ).first()

    if not membership:
        raise HTTPException(status_code=404, detail="Member not found in your family.")

    target_user = db.query(models.User).filter(models.User.id == user_id).first()

    # 1. Clean up or unlink storage accounts belonging to this member in this family
    storage_filters = [models.StorageAccount.user_id == user_id]
    if target_user and target_user.email:
        storage_filters.append(models.StorageAccount.email == target_user.email)

    from sqlalchemy import or_
    member_storage_accounts = db.query(models.StorageAccount).filter(
        models.StorageAccount.family_id == current_user.family_id,
        or_(*storage_filters)
    ).all()

    for sa in member_storage_accounts:
        files_count = db.query(models.File).filter(models.File.storage_account_id == sa.id).count()
        if files_count > 0:
            try:
                from storage.storage_manager import StorageManager
                StorageManager().migrate_account_files(sa.id, db)
            except Exception:
                db.query(models.File).filter(models.File.storage_account_id == sa.id).update(
                    {models.File.storage_account_id: None}
                )
        db.delete(sa)

    # 2. Invalidate active tokens / sessions
    if target_user:
        if target_user.current_token_jti:
            db.add(models.RevokedToken(jti=target_user.current_token_jti))
        if target_user.mobile_token_jti:
            db.add(models.RevokedToken(jti=target_user.mobile_token_jti))

    # 3. Clean up PasswordResetOTPs for this user
    if target_user and target_user.email:
        db.query(models.PasswordResetOTP).filter(models.PasswordResetOTP.email == target_user.email).delete()

    # 4. Safely preserve vault files uploaded by this user by setting uploader_id = NULL
    db.query(models.File).filter(models.File.uploader_id == user_id).update(
        {models.File.uploader_id: None}
    )

    # 5. Set created_by = NULL on any shared links created by this user
    db.query(models.SharedLink).filter(models.SharedLink.created_by == user_id).update(
        {models.SharedLink.created_by: None}
    )

    # 6. Set user_id = NULL on any audit logs
    db.query(models.AuditLog).filter(models.AuditLog.user_id == user_id).update(
        {models.AuditLog.user_id: None}
    )

    # 7. Delete the FamilyMember record
    db.delete(membership)

    # 8. Delete the User record so username, email, and credentials are completely cleared
    if target_user:
        db.delete(target_user)

    db.commit()
    return None

@router.get("/details", response_model=schemas.FamilyResponse)
def get_family_details(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Find which family the current user belongs to
    membership = db.query(models.FamilyMember).filter(models.FamilyMember.user_id == current_user.id).first()
    if not membership:
        raise HTTPException(status_code=404, detail="You do not belong to any family.")

    family = db.query(models.Family).filter(models.Family.id == membership.family_id).first()
    if not family:
        raise HTTPException(status_code=404, detail="Family group not found.")

    return family

@router.put("/details", response_model=schemas.FamilyResponse)
def update_family_details(
    update_data: schemas.FamilySetup,
    current_user: models.User = Depends(auth.get_admin_user),
    db: Session = Depends(get_db)
):
    family = db.query(models.Family).filter(models.Family.admin_id == current_user.id).first()
    if not family:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You do not administer any family group."
        )

    # Check that new max_members isn't less than current member count
    current_count = db.query(models.FamilyMember).filter(models.FamilyMember.family_id == family.id).count()
    if update_data.max_members < current_count:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reduce capacity to {update_data.max_members}. You already have {current_count} active members."
        )

    family.name = update_data.name.strip()
    family.max_members = update_data.max_members
    db.commit()
    db.refresh(family)
    return family

@router.post("/regenerate-code", response_model=schemas.FamilySetupResponse)
def regenerate_family_code(
    setup_data: schemas.FamilySetup,
    current_user: models.User = Depends(auth.get_admin_user),
    db: Session = Depends(get_db)
):
    # Find the user's family
    family = db.query(models.Family).filter(models.Family.admin_id == current_user.id).first()
    if not family:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You do not administer any family group."
        )

    import hashlib
    effective_name = setup_data.name.strip() if setup_data.name else family.name
    effective_max = setup_data.max_members if setup_data.max_members else family.max_members

    plaintext_code = generate_family_secret_code(effective_name, effective_max)
    formatted_plaintext = f"{plaintext_code[:4]}-{plaintext_code[4:]}"
    hashed_code = auth.get_password_hash(plaintext_code)
    sha256_hash = hashlib.sha256(plaintext_code.encode("utf-8")).hexdigest()

    # Update family details
    family.name = effective_name
    family.max_members = effective_max
    family.secret_code_hash = hashed_code
    family.secret_code_sha256 = sha256_hash
    family.expires_at = datetime.now(timezone.utc) + timedelta(minutes=1)
    db.commit()

    return schemas.FamilySetupResponse(
        family_id=family.id,
        name=family.name,
        secret_code=formatted_plaintext,
        max_members=family.max_members,
        expires_at=family.expires_at
    )
