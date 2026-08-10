from fastapi import Request

def get_client_ip(request: Request) -> str:
    """
    Extracts the client's real IP address from proxy headers if present,
    falling back to the standard request client host.
    """
    # Check X-Forwarded-For header (commonly set by reverse proxies like Nginx, Cloudflare, Vercel, Render)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # X-Forwarded-For can contain multiple IPs separated by comma (client, proxy1, proxy2)
        # We take the first IP which is the original client IP
        return forwarded_for.split(",")[0].strip()
    
    # Check X-Real-IP header as a fallback
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
        
    return request.client.host if request.client else "127.0.0.1"
