import os
import io
import time
import requests
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload, MediaIoBaseDownload
from storage.base import StorageProvider

class GoogleDriveProvider(StorageProvider):
    def _get_client(self, config: dict):
        client_id = config.get("client_id")
        client_secret = config.get("client_secret")
        access_token = config.get("access_token")
        refresh_token = config.get("refresh_token")
        expires_at = config.get("expires_at", 0)
        family_id = config.get("family_id")
        
        if not client_id or not client_secret or not refresh_token:
            raise Exception("Google OAuth Client ID, Client Secret, and Refresh Token are required")
            
        current_time = time.time()
        if current_time >= expires_at - 60: # 60 seconds buffer
            try:
                url = "https://oauth2.googleapis.com/token"
                payload = {
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token"
                }
                r = requests.post(url, data=payload)
                if r.status_code != 200:
                    raise Exception(f"Failed to refresh Google token: {r.text}")
                res = r.json()
                access_token = res["access_token"]
                expires_in = res["expires_in"]
                expires_at = current_time + expires_in
                
                # Update config dict
                config["access_token"] = access_token
                config["expires_at"] = expires_at
                
                # Update DB if family_id is provided
                if family_id:
                    from database import SessionLocal
                    import models
                    db = SessionLocal()
                    try:
                        family = db.query(models.Family).filter(models.Family.id == family_id).first()
                        if family:
                            family.storage_config = config
                            db.commit()
                    finally:
                        db.close()
            except Exception as e:
                raise Exception(f"Google Token Refresh Error: {str(e)}")
                
        creds = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=client_id,
            client_secret=client_secret
        )
        service = build('drive', 'v3', credentials=creds)
        return service

    def health_check(self, config: dict) -> bool:
        """Lightweight ping: GET /drive/v3/about with 3s timeout."""
        try:
            # Ensure we have a valid access token (refresh if needed)
            self._get_client(config)
            access_token = config.get("access_token")
            if not access_token:
                return False
            r = requests.get(
                "https://www.googleapis.com/drive/v3/about?fields=user",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=3
            )
            return r.status_code == 200
        except Exception:
            return False

    def verify_credentials(self, config: dict) -> bool:
        try:
            service = self._get_client(config)
            # Try to get root folder metadata to verify access
            service.files().get(fileId="root", fields="id, name", supportsAllDrives=True).execute()
            return True
        except Exception as e:
            raise Exception(f"OAuth verification failed: {str(e)}")

    def ensure_vault_folder(self, family_id: str, config: dict) -> str:
        service = self._get_client(config)
        folder_name = "famdoc"
        
        # Look for the folder 'famdoc' in My Drive root
        query = f"mimeType = 'application/vnd.google-apps.folder' and name = '{folder_name}' and 'root' in parents and trashed = false"
        
        from storage.base import SimpleRetry
        results = None
        for attempt in SimpleRetry(attempts=3, wait=1):
            with attempt:
                results = service.files().list(
                    q=query,
                    spaces='drive',
                    fields='files(id, name)',
                    pageSize=1,
                    supportsAllDrives=True,
                    includeItemsFromAllDrives=True
                ).execute()
                
        files = results.get('files', [])
        if files:
            return files[0]['id']
            
        # Create folder in My Drive root
        file_metadata = {
            'name': folder_name,
            'mimeType': 'application/vnd.google-apps.folder',
            'parents': ['root']
        }
        
        new_folder = None
        for attempt in SimpleRetry(attempts=3, wait=1):
            with attempt:
                new_folder = service.files().create(body=file_metadata, fields='id', supportsAllDrives=True).execute()
                
        return new_folder.get('id')

    def upload_file(self, config: dict, vault_folder_id: str, filename: str, file_content: bytes, mimetype: str, username: str = None) -> dict:
        service = self._get_client(config)
        
        target_folder_id = vault_folder_id
        if username:
            # Query for the subfolder with name = username under parent vault_folder_id (which is root famdoc folder)
            query = f"mimeType = 'application/vnd.google-apps.folder' and name = '{username}' and '{vault_folder_id}' in parents and trashed = false"
            
            from storage.base import SimpleRetry
            results = None
            for attempt in SimpleRetry(attempts=3, wait=1):
                with attempt:
                    results = service.files().list(
                        q=query,
                        spaces='drive',
                        fields='files(id, name)',
                        pageSize=1,
                        supportsAllDrives=True,
                        includeItemsFromAllDrives=True
                    ).execute()
                    
            subfolders = results.get('files', [])
            if subfolders:
                target_folder_id = subfolders[0]['id']
            else:
                # Create the subfolder under vault_folder_id
                subfolder_metadata = {
                    'name': username,
                    'mimeType': 'application/vnd.google-apps.folder',
                    'parents': [vault_folder_id]
                }
                new_subfolder = None
                for attempt in SimpleRetry(attempts=3, wait=1):
                    with attempt:
                        new_subfolder = service.files().create(body=subfolder_metadata, fields='id', supportsAllDrives=True).execute()
                target_folder_id = new_subfolder.get('id')
        
        file_metadata = {
            'name': filename,
            'parents': [target_folder_id]
        }
        
        media = MediaIoBaseUpload(io.BytesIO(file_content), mimetype=mimetype, resumable=True)
        
        from storage.base import SimpleRetry
        uploaded_file = None
        for attempt in SimpleRetry(attempts=3, wait=1):
            with attempt:
                uploaded_file = service.files().create(
                    body=file_metadata,
                    media_body=media,
                    fields='id, webViewLink',
                    supportsAllDrives=True
                ).execute()
                
        cloud_file_id = uploaded_file.get('id')
        cloud_link = uploaded_file.get('webViewLink')
        
        return {
            "cloud_file_id": cloud_file_id,
            "cloud_link": cloud_link
        }

    def download_file(self, config: dict, cloud_file_id: str) -> bytes:
        service = self._get_client(config)
        
        request = service.files().get_media(fileId=cloud_file_id, supportsAllDrives=True)
        fh = io.BytesIO()
        downloader = MediaIoBaseDownload(fh, request)
        
        from storage.base import SimpleRetry
        for attempt in SimpleRetry(attempts=3, wait=1):
            with attempt:
                fh.seek(0)
                fh.truncate(0)
                downloader = MediaIoBaseDownload(fh, request)
                done = False
                while not done:
                    status, done = downloader.next_chunk()
                    
        return fh.getvalue()

    def delete_file(self, config: dict, cloud_file_id: str) -> bool:
        service = self._get_client(config)
        
        from storage.base import SimpleRetry
        for attempt in SimpleRetry(attempts=3, wait=1):
            with attempt:
                try:
                    service.files().delete(fileId=cloud_file_id, supportsAllDrives=True).execute()
                except Exception as e:
                    if "fileNotFound" in str(e) or "404" in str(e):
                        return True
                    raise e
        return True

    def rename_file(self, config: dict, cloud_file_id: str, new_name: str) -> bool:
        service = self._get_client(config)
        
        file_metadata = {
            'name': new_name
        }
        
        from storage.base import SimpleRetry
        for attempt in SimpleRetry(attempts=3, wait=1):
            with attempt:
                service.files().update(
                    fileId=cloud_file_id,
                    body=file_metadata,
                    fields='id',
                    supportsAllDrives=True
                ).execute()
        return True

    def get_direct_download_url(self, config: dict, cloud_file_id: str) -> str:
        # Resolve/refresh credentials to ensure access_token is current
        self._get_client(config)
        access_token = config.get("access_token")
        if access_token:
            return f"https://www.googleapis.com/drive/v3/files/{cloud_file_id}?alt=media&access_token={access_token}"
        return None
