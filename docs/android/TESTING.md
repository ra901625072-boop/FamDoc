# FamDoc Android Testing & QA Strategy

This document outlines the test strategy and verification test cases for the FamDoc Android application.

---

## 1. Test Matrix Summary

| Test Area | Scope | Verification Status |
|---|---|---|
| **Authentication** | Registration, Login, Family Join, Auto-login, Password Reset OTP, Session Logout, 401 Expiration | ✅ Verified |
| **Shared Vault** | Breadcrumb Navigation, Root & Subfolder drilling, Folder Create/Rename/Move/Delete | ✅ Verified |
| **File Management** | SAF File Picker, Multipart Upload, Rename, Move, Soft Delete, Download & System Viewers | ✅ Verified |
| **File Previews** | High-res Coil Async Image preview, formatted text viewing, PDF preview launcher | ✅ Verified |
| **Sharing** | Public Share Link creation, password protection, copy link to clipboard, Public Share View & Download | ✅ Verified |
| **Recycle Bin** | Listing soft-deleted files and folders, single/batch restoration, permanent purge (admin only) | ✅ Verified |
| **Family Settings** | Member roster view, Invitation code 1-tap copy, Admin code regeneration, Member removal | ✅ Verified |
| **Storage Config** | Storage mode toggle (`local` vs `google`), Multi-account quota meters, Custom Tabs OAuth | ✅ Verified |
| **Resilience & Network**| Offline detection banner, Render cold-start wake-up handling & retry, Timeout recovery | ✅ Verified |

---

## 2. Manual QA Test Procedures

### Test Case 1: User Registration & Auto Family Vault Provisioning
1. Launch app -> Tap "Create a Family Vault".
2. Enter username `testadmin`, email `testadmin@example.com`, password `Password123`.
3. Tap "Initialize Family Vault".
4. **Expected Result**: User is registered, a family vault is automatically provisioned, JWT token is securely stored, and user lands on the Dashboard.

### Test Case 2: Join Family Vault with Invitation Code
1. From Welcome Screen, tap "Join with Family Code".
2. Enter valid 8-character invitation code, username `familymember`, email `member@example.com`.
3. Tap "Join Vault".
4. **Expected Result**: Authenticates successfully as member, user is bound to the family vault and redirected to Dashboard.

### Test Case 3: File Upload & Preview
1. In Vault Screen, tap the Floating Action Button.
2. Select an image or document file from device storage.
3. Observe upload progress indicator modal.
4. **Expected Result**: File appears in the current folder list with correct MIME icon, size, and timestamp. Tapping the file opens the full-screen preview.

### Test Case 4: Cold-Start Wakeup Handling
1. Start app when Render backend is asleep.
2. Make any network request.
3. **Expected Result**: App displays non-blocking "Waking up secure Render server, please hold on..." banner with exponential backoff retry rather than crashing or freezing.
