# Setup Guide: Family Document Management System

This guide walks you through the configuration and deployment of the Family Document Management web application. The backend runs on Python FastAPI (SQLite DB) and the frontend is built using single-page vanilla HTML/CSS/JS.

---

## 1. Prerequisites

Ensure you have the following installed on your system:
- **Python 3.10+**
- **pip** (Python package installer)
- A web browser (Chrome, Firefox, Edge, etc.)

---

## 2. Installation Steps

### Step 1: Install Dependencies
Open your terminal, navigate to the `backend` folder, and install the required dependencies:

```bash
cd backend
pip install -r requirements.txt
```

### Step 2: Configure Environment Variables
Inside the `backend` folder, make a copy of the `.env.example` file and rename it to `.env`:

```bash
cp .env.example .env
```

Open `.env` and review the settings:
*   Set a strong secret key for `JWT_SECRET` (used for securing user login sessions).
*   By default, the SQLite database is saved as `family_documents.db` inside the backend directory.

---

## 3. Storage Provider Integration Setup

Administrators select the cloud storage provider inside the web interface. Below is how to set up the credentials for each provider.

### Option A: Google Drive API (OAuth2)
To save family vault files in Google Drive:
1.  Go to the **[Google Cloud Console](https://console.cloud.google.com/)**.
2.  Create a new project (e.g., "Family Vault").
3.  Navigate to **APIs & Services > Library** and search for **Google Drive API**. Click **Enable**.
4.  Navigate to **OAuth consent screen**:
    *   Select **External** user type.
    *   Fill out the app name and support email.
    *   In the **Scopes** section, add the following scope:
        `https://www.googleapis.com/auth/drive.file` (This restricted scope allows our app to access only files and folders it creates).
    *   Add test users (your Google account emails) if you keep the app in Publishing status: "Testing".
5.  Navigate to **Credentials > Create Credentials > OAuth client ID**:
    *   Application type: **Web application**.
    *   Name: `FamilyVault Web client`.
    *   Authorized redirect URIs:
        `http://localhost:8000/api/storage/oauth2callback` (Note: If your backend runs on a different port, update this URI accordingly).
6.  Click **Create** and copy your **Client ID** and **Client Secret**.
7.  *Configuration:* The Admin can paste these client credentials directly into the storage setup settings form in the web UI, or they can be pasted globally in the `.env` file as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

---

## 4. Running the Application

To start the FastAPI backend server:

```bash
cd backend
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Once the server has started:
1.  Open your browser and navigate to **[http://localhost:8000](http://localhost:8000)**.
2.  FastAPI automatically hosts both the REST endpoints and mounts the frontend pages. You will be greeted by the FamilyVault login screen.
3.  To view the interactive REST API documentation, navigate to **[http://localhost:8000/docs](http://localhost:8000/docs)**.

---

## 5. Walkthrough of App Features

1.  **Register a Family Admin**: Fill out the Sign Up page. Leave the "Family ID" input empty. Upon submitting, the system creates a new family group, auto-generates a unique Family ID, and sets your account role to **Admin**.
2.  **Add Family Members**: Share the Family ID displayed in your sidebar with other members. They can register by pasting that ID into the "Family ID (Optional)" field on the Sign Up page to join your vault as **Members**.
3.  **Choose Cloud Storage**: As Admin, navigate to **Storage Provider** in the sidebar, input your credentials for Google Drive, and authenticate.
4.  **Create Folders & Upload Files**: Navigate to the **Shared Vault**. Drag and drop documents, or use the file selector to upload images (`.png`, `.jpg`), PDFs, text, or Word documents. 
5.  **View & Manage**: Double-click files or select "Open Preview" from the action menu to preview PDFs, text, and images. Rename or delete items. Members can delete only files they uploaded, while the Admin has full delete permissions.
