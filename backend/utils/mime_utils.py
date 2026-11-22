"""
MIME type and file extension utilities for FDMS.
Ensures every file downloaded or previewed has an accurate MIME type
and a proper file extension recognised by all operating systems.
"""

import os
import mimetypes

MAGIC_BYTE_SIGNATURES = [
    (b"\xff\xd8\xff", "image/jpeg", ".jpg"),
    (b"\x89PNG\r\n\x1a\n", "image/png", ".png"),
    (b"%PDF-", "application/pdf", ".pdf"),
    (b"GIF87a", "image/gif", ".gif"),
    (b"GIF89a", "image/gif", ".gif"),
    (b"BM", "image/bmp", ".bmp"),
    (b"\x1a\x45\xdf\xa3", "video/webm", ".webm"),
    (b"ID3", "audio/mpeg", ".mp3"),
    (b"\xff\xfb", "audio/mpeg", ".mp3"),
]

MIME_TO_DEFAULT_EXT = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
    "image/bmp": ".bmp",
    "image/x-icon": ".ico",
    "application/pdf": ".pdf",
    "application/zip": ".zip",
    "application/x-zip-compressed": ".zip",
    "application/json": ".json",
    "text/plain": ".txt",
    "text/csv": ".csv",
    "text/html": ".html",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
    "audio/mpeg": ".mp3",
    "audio/wav": ".wav",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
}

EXT_TO_MIME = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".bmp": "image/bmp",
    ".ico": "image/x-icon",
    ".pdf": "application/pdf",
    ".zip": "application/zip",
    ".json": "application/json",
    ".txt": "text/plain",
    ".csv": "text/csv",
    ".html": "text/html",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}


def detect_mime_from_bytes(content: bytes) -> tuple[str | None, str | None]:
    """Detect MIME type and preferred extension from raw byte magic numbers."""
    if not content:
        return None, None

    header = content[:32]

    # WebP check: RIFF....WEBP
    if len(header) >= 12 and header.startswith(b"RIFF") and header[8:12] == b"WEBP":
        return "image/webp", ".webp"

    # MP4 check: ftyp in first 16 bytes
    if b"ftyp" in header[:16]:
        return "video/mp4", ".mp4"

    # Zip-based formats (ZIP, DOCX, XLSX, etc.)
    if header.startswith(b"PK\x03\x04"):
        return "application/zip", ".zip"

    for magic, mime, ext in MAGIC_BYTE_SIGNATURES:
        if header.startswith(magic):
            return mime, ext

    return None, None


def resolve_download_filename_and_type(
    filename: str,
    file_type: str | None = None,
    content: bytes | None = None,
) -> tuple[str, str]:
    """
    Guarantees that:
    1. The filename always has a valid file extension matching its type.
    2. The MIME type is accurate (never falls back to raw octet-stream when identifiable).
    """
    clean_name = (filename or "document").strip()
    clean_type = (file_type or "").strip().lower()

    # Step 1: Detect from content bytes if available
    detected_mime, detected_ext = (None, None)
    if content:
        detected_mime, detected_ext = detect_mime_from_bytes(content)

    # Step 2: Extract current extension from clean_name if present
    base_name, current_ext = os.path.splitext(clean_name)
    current_ext = current_ext.lower()

    # Step 3: Determine the true MIME type
    final_mime = None
    if detected_mime:
        final_mime = detected_mime
    elif clean_type and clean_type != "application/octet-stream":
        final_mime = clean_type
    elif current_ext in EXT_TO_MIME:
        final_mime = EXT_TO_MIME[current_ext]
    else:
        guessed, _ = mimetypes.guess_type(clean_name)
        if guessed:
            final_mime = guessed
        else:
            final_mime = "application/octet-stream"

    # Step 4: Determine the appropriate extension
    target_ext = None
    if current_ext and len(current_ext) >= 2:
        # File already has an extension
        target_ext = current_ext
    elif detected_ext:
        target_ext = detected_ext
    elif final_mime in MIME_TO_DEFAULT_EXT:
        target_ext = MIME_TO_DEFAULT_EXT[final_mime]
    else:
        guessed_ext = mimetypes.guess_extension(final_mime)
        if guessed_ext:
            target_ext = ".jpg" if guessed_ext == ".jpe" else guessed_ext

    # Step 5: Append extension if missing or incomplete
    final_filename = clean_name
    if target_ext and not clean_name.lower().endswith(target_ext):
        final_filename = f"{clean_name}{target_ext}"

    return final_filename, final_mime
