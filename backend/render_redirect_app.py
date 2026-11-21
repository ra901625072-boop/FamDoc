"""
backend/render_redirect_app.py

Lightweight FastAPI HTTP 308 Permanent Redirect Proxy.
Deployed to the legacy Render web service (https://famdoc-backend.onrender.com)
during cutover to seamlessly forward traffic from legacy mobile APKs
to Cloudflare (https://api.famdoc.com).

HTTP 308 guarantees that clients preserve the HTTP request method and body
(unlike 301/302 which may mutate POST to GET).
"""

from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse, JSONResponse
import os
import uvicorn

TARGET_DOMAIN = os.getenv("REDIRECT_TARGET_DOMAIN", "https://api.famdoc.com").rstrip("/")

app = FastAPI(
    title="FamDoc Legacy Render Redirect Proxy",
    description="Forwards legacy traffic to Cloudflare backend with zero data loss",
    version="1.0.0"
)


@app.get("/health")
def health_check():
    """Health check endpoint for Render service monitoring"""
    return JSONResponse(
        status_code=200,
        content={
            "status": "active_redirect_proxy",
            "target": TARGET_DOMAIN,
            "message": "Legacy Render service forwarding all requests to Cloudflare via HTTP 308"
        }
    )


@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"])
async def redirect_all(request: Request, path: str):
    """
    Catches all incoming requests across all HTTP verbs and redirects them to Cloudflare.
    Preserves query parameters, headers, and request body.
    """
    query_string = request.url.query
    new_url = f"{TARGET_DOMAIN}/{path}"
    if query_string:
        new_url = f"{new_url}?{query_string}"

    # HTTP 308 Permanent Redirect preserves the request method and body across redirects
    return RedirectResponse(url=new_url, status_code=308)


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
