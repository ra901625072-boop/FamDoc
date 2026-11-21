import { DurableObject } from "cloudflare:workers";

interface Env {
  FAMDOC_CONTAINER: DurableObjectNamespace;
  VAULT_BUCKET: R2Bucket;
  INTERNAL_API_SECRET?: string;
  APP_ENV?: string;
  CORS_ORIGINS?: string;
}

// Durable Object class managing container lifecycle & port 8000 routing
export class FamDocContainer extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    const container = (this.ctx as any).container;
    
    // Ensure container is running and listening on port 8000 (FastAPI / Uvicorn)
    await container.startAndWaitForPort(8000, {
      inactivityTimeout: 15 * 60 * 1000 // Sleep after 15m idle to optimize cost
    });
    
    // Forward request to container port 8000
    return container.getTcpPort(8000).fetch(request);
  }
}

// Edge Worker fetch entrypoint
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // 1. Direct Edge Health Check (Sub-millisecond latency)
    if (url.pathname === "/api/health/edge") {
      return new Response(JSON.stringify({ status: "ok", edge: "cloudflare-workers" }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. Rapid CORS Preflight handling at Edge (< 5ms response time)
    if (request.method === "OPTIONS") {
      const origin = request.headers.get("Origin") || "*";
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
          "Access-Control-Allow-Headers": "Authorization, Content-Type, Range, X-Client-Type, X-Requested-With",
          "Access-Control-Expose-Headers": "Content-Disposition, Content-Range, Accept-Ranges, Content-Length",
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Max-Age": "86400"
        }
      });
    }

    // 3. Route API requests to the Container Durable Object
    const id = env.FAMDOC_CONTAINER.idFromName("default");
    const stub = env.FAMDOC_CONTAINER.get(id);

    try {
      const response = await stub.fetch(request);
      
      // Inject Edge Security Headers onto response
      const headers = new Headers(response.headers);
      headers.set("X-Content-Type-Options", "nosniff");
      headers.set("X-Frame-Options", "DENY");
      headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: headers
      });
    } catch (err: any) {
      return new Response(JSON.stringify({
        error: "Backend container unavailable",
        detail: String(err)
      }), {
        status: 503,
        headers: { "Content-Type": "application/json" }
      });
    }
  },

  // 4. Cron Trigger Handler for Nightly Retention Purge
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const id = env.FAMDOC_CONTAINER.idFromName("default");
    const stub = env.FAMDOC_CONTAINER.get(id);
    
    ctx.waitUntil(
      stub.fetch(new Request("http://container:8000/api/internal/cleanup-retention", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.INTERNAL_API_SECRET || "internal-cron-secret"}`
        }
      }))
    );
  }
};
