# Decoupled Deployment Guide: Vercel, Render & Supabase

This guide walks you through deploying the **FamDoc** frontend on Vercel, the FastAPI backend on Render, and connecting them to a **Supabase PostgreSQL** database.

---

## 1. Setup Supabase (PostgreSQL Database)

Since Render's free tier has an ephemeral disk, we store all family records, users, and folder structures in a persistent database. Supabase provides a free PostgreSQL tier.

1. Go to **[Supabase](https://supabase.com/)** and sign in.
2. Click **New Project** and select/create an organization.
3. Fill out the project details:
   *   **Name**: `FamDoc Database`
   *   **Database Password**: *Set a strong password and save it somewhere secure.*
   *   **Region**: Select a region close to your target audience (or close to US East if using Render's defaults).
4. Wait a few minutes for the database to provision.
5. Go to **Project Settings > Database** (gear icon on sidebar).
6. Under **Connection string**, select the **URI** tab.
7. Copy the connection string. It will look like this:
   ```text
   postgresql://postgres.[your-project-id]:[your-password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
   *Replace `[your-password]` with the database password you created in Step 3.*

---

## 2. Deploy Frontend on Vercel

We deploy the static frontend folder (`/frontend`) to Vercel.

1. Go to **[Vercel](https://vercel.com/)** and sign in.
2. Click **Add New > Project** and import your Git repository.
3. In the project configuration screen:
   *   **Project Name**: `famdoc` (or your choice).
   *   **Framework Preset**: Select **Other**.
   *   **Root Directory**: Click *Edit* and select the **`frontend`** directory. (This is critical: it tells Vercel to only deploy the HTML/CSS/JS files inside the `frontend` folder).
4. Click **Deploy**.
5. Once deployment completes, copy your Vercel deployment URL (e.g., `https://famdoc.vercel.app`).

---

## 3. Deploy Backend on Render

We deploy the FastAPI backend service from the `/backend` folder.

### Using Render Blueprints (Recommended)
We have included a `render.yaml` Blueprint file at the root. Render will read this and automatically configure the service.

1. Go to **[Render](https://render.com/)** and sign in.
2. Click **New > Blueprint**.
3. Select your Git repository.
4. Render will read the `render.yaml` file and prompt you for the required environment variables:
   *   **`DATABASE_URL`**: Paste your **Supabase Connection String URI** (copied in Section 1).
   *   **`FRONTEND_URL`**: Paste your Vercel frontend URL (e.g. `https://famdoc.vercel.app`).
   *   **`BACKEND_URL`**: Paste your final Render URL. (When creating a service, Render generates a preview URL, e.g. `https://famdoc-backend.onrender.com`. Paste this URL here).
   *   **`CORS_ORIGINS`**: Paste your Vercel URL again to authorize cross-origin API calls.
5. Click **Apply**.
6. Render will build the service, install dependencies via `pip`, run the database migrations, and start the FastAPI uvicorn server.

---

## 4. Hooking Frontend and Backend Together

You have two choices to link the deployed Vercel frontend with the Render backend:

### Option A: Proxy Rewrite via Vercel (Recommended)
This approach routes all `/api/*` traffic from Vercel back to Render behind the scenes, resolving all CORS questions automatically.

1. Open [`frontend/vercel.json`](file:///d:/FDMS/frontend/vercel.json) in your project.
2. Edit the destination URL to point to your actual Render backend:
   ```json
   {
     "version": 2,
     "cleanUrls": false,
     "rewrites": [
       {
         "source": "/api/:path*",
         "destination": "https://famdoc-backend.onrender.com/api/:path*"
       }
     ]
   }
   ```
3. Commit and push the changes to your Git repository. Vercel will auto-redeploy.
4. Keep the `API_BASE_URL` empty in `api.js`. The app will load seamlessly!

### Option B: Direct CORS Requests
If you prefer direct connection without proxying:

1. Open [`frontend/js/api.js`](file:///d:/FDMS/frontend/js/api.js).
2. Find `const API_BASE_URL = ...` at the top of the file.
3. Paste your Render backend URL there:
   ```javascript
   const API_BASE_URL = "https://famdoc-backend.onrender.com";
   ```
4. Commit and push the changes to your repository.

---

## 5. Local Development Testing

To run the frontend locally while connecting to the deployed Render backend (or to a local backend on port `8000`):

1. Start your local FastAPI backend:
   ```bash
   cd backend
   python -m uvicorn main:app --reload
   ```
2. Open your browser console on your local frontend page, and set the API override:
   ```javascript
   // Point frontend to your local backend
   localStorage.setItem("famdoc_api_base_url", "http://localhost:8000");
   
   // Or point it to your production Render backend directly
   localStorage.setItem("famdoc_api_base_url", "https://famdoc-backend.onrender.com");
   ```
3. To clear the override and use default relative paths again:
   ```javascript
   localStorage.removeItem("famdoc_api_base_url");
   ```
