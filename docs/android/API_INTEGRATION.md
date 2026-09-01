# FamDoc Android REST API Integration Specification

This document details the contract between the **FamDoc Android Application** and the **FastAPI Render Backend**.

---

## 1. Base Configuration & Headers

* **Production URL**: `https://famdoc-backend.onrender.com`
* **Local Development**: `http://10.0.2.2:8000` (Android Emulator) or `http://localhost:8000`
* **Standard Headers**:
  - `Accept: application/json`
  - `Content-Type: application/json` (omitted on `multipart/form-data`)
  - `Authorization: Bearer <access_token>` (injected by `AuthInterceptor`)

---

## 2. API Endpoints Reference

### Authentication (`AuthApi`)
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "admin_user",
  "email": "user@example.com",
  "password": "Password123"
}
-> 201 Created: User object
```

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123"
}
-> 200 OK: { "access_token": "...", "token_type": "bearer" }
```

```http
POST /api/auth/family-login
Content-Type: application/json

{
  "username": "member_user",
  "email": "member@example.com",
  "secret_code": "AB12CD34",
  "password": "OptionalPassword123"
}
-> 200 OK: { "access_token": "...", "token_type": "bearer" }
```

```http
GET /api/auth/me
Authorization: Bearer <token>
-> 200 OK: User object with family_id and role
```

```http
POST /api/auth/logout
Authorization: Bearer <token>
-> 200 OK
```

```http
POST /api/auth/forgot-password/request
POST /api/auth/forgot-password/verify
POST /api/auth/forgot-password/reset
```

---

### Folders (`FoldersApi`)
```http
GET /api/folders
Authorization: Bearer <token>
-> 200 OK: List<FolderItem> [ { "id": 1, "name": "Taxes", "file_count": 4, "total_size": 1048576, ... } ]
```

```http
POST /api/folders
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Tax Receipts 2026",
  "parent_id": null
}
-> 201 Created: FolderItem
```

```http
PUT /api/folders/{id}
PATCH /api/folders/{id}/move
DELETE /api/folders/{id}
```

---

### Files (`FilesApi`)
```http
GET /api/files?folder_id=root
Authorization: Bearer <token>
-> 200 OK: List<FileItem>
```

```http
POST /api/files/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

[Part: file (binary data)]
[Part: folder_id (optional text)]
-> 201 Created: FileItem
```

```http
GET /api/files/{id}/download
Authorization: Bearer <token>
-> 200 OK (Stream binary octet-stream)
```

```http
GET /api/files/{id}/preview?token={previewToken}
-> 200 OK (Stream image/pdf binary)
```

---

### Public Sharing (`ShareApi`)
```http
POST /api/files/{id}/share
Content-Type: application/json
Authorization: Bearer <token>

{
  "password": "OptionalPassword",
  "expires_at": null,
  "max_downloads": 5
}
-> 201 Created: ShareLink object
```

```http
GET /api/shared/{token}
-> 200 OK: PublicShareInfo (Unauthenticated)
```

```http
POST /api/shared/{token}/download
Content-Type: application/json

{
  "password": "PasswordIfRequired"
}
-> 200 OK (Stream binary)
```

---

### Recycle Bin (`RecycleBinApi`)
```http
GET /api/recycle-bin
Authorization: Bearer <token>
-> 200 OK: { "files": [...], "folders": [...] }
```

```http
POST /api/recycle-bin/{item_type}/{item_id}/restore
Authorization: Bearer <token>
-> 200 OK: { "message": "Successfully restored" }
```

```http
DELETE /api/recycle-bin/{item_type}/{item_id}/purge
Authorization: Bearer <token>
-> 200 OK: { "message": "Permanently purged" }
```
