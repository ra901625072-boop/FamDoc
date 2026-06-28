import hashlib
import httpx
from config import VIRUSTOTAL_API_KEY
from logging_config import logger

async def scan_file_for_viruses(file_content: bytes, filename: str) -> bool:
    """
    Checks if a file is malicious using VirusTotal API.
    Uses SHA-256 hash lookup to perform rapid O(1) synchronous check.
    If the file hash is unknown (404), submits it for async scanning.
    Returns:
        bool: True if file is clean/unknown (safe to upload), False if file is flagged as malicious.
    """
    if not VIRUSTOTAL_API_KEY:
        # Pass-through if no API key is configured
        logger.warning("WARNING: VirusTotal API Key not configured. Skipping virus scan.")
        return True

    # Compute SHA-256 hash of file content
    file_hash = hashlib.sha256(file_content).hexdigest()
    
    url = f"https://www.virustotal.com/api/v3/files/{file_hash}"
    headers = {"x-apikey": VIRUSTOTAL_API_KEY}

    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                data = response.json()
                # Check detection statistics
                stats = data.get("data", {}).get("attributes", {}).get("last_analysis_stats", {})
                malicious_count = stats.get("malicious", 0)
                suspicious_count = stats.get("suspicious", 0)
                
                if malicious_count > 0 or suspicious_count > 1:
                    logger.warning(f"SECURITY ALERT: File '{filename}' matches malware signature (Malicious: {malicious_count}, Suspicious: {suspicious_count}).")
                    return False
            elif response.status_code == 404:
                # File is unknown to VirusTotal, submit it for async scan in the background
                try:
                    await client.post(
                        "https://www.virustotal.com/api/v3/files",
                        headers=headers,
                        files={"file": (filename, file_content)}
                    )
                    logger.info(f"Info: File '{filename}' is unknown to VirusTotal. Submitted for analysis.")
                except Exception as upload_err:
                    logger.warning(f"Warning: Failed to submit unknown file '{filename}' to VirusTotal: {upload_err}")
                return True
            else:
                # If rate limited or other error, fallback to True but log
                logger.warning(f"Warning: VirusTotal API error ({response.status_code}): {response.text}")
                return True
    except Exception as e:
        logger.error(f"Warning: VirusTotal check failed with error: {str(e)}")
        # In case of API failure, fail open but log
        return True
    return True
