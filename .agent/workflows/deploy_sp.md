---
description: How to safely deploy ShadowPulse features and updates
---

# Deploy ShadowPulse Workflow

This workflow ensures safe deployment of the ShadowPulse project according to its structural and architectural rules (as defined in the `/sp` and `/web1` documentation).

## Step 1: Extension Deployment (Automated via GitHub)

If you modified any files in the `\extension` directory:

1. Check `c:\Users\martin\Documents\Projects\ShadowPulse_V2\extension\manifest.json` and **increment the version number** (e.g., bump from 2.0.6 to 2.0.7).
2. Check `c:\Users\martin\Documents\Projects\ShadowPulse_V2\backend\reports\install.php`:
   - Update the visual version number to match your new version (e.g., `Installation Guide (2.0.7)` and `Guide v2.0.7`).
   - Update the download `href` link to match the new versioned zip file (e.g., `ShadowPulse-v2.0.7.zip`) inside the GitHub Releases URL.
3. Commit both files (and your extension changes) to git and push to origin `main`.
4. Wait for the **GitHub Action** to automatically build and release the zipped extension on the repository's Releases page.
5. Notify the user that the extension needs to be reloaded in Chrome.
6. **IMPORTANT**: You must still proceed to Step 2 to manually deploy the updated `install.php` to the live `web1` server!

## Step 2: Backend Deployment to Web1

If you modified any files in the `\backend` directory:

1. Identify the modified backend files.
2. **Apply the CRITICAL Path Mapping**:
   - Local: `c:\Users\martin\Documents\Projects\ShadowPulse_V2\backend\*`
   - Remote: `/var/www/html/*`
   - _Never include the `backend/` folder prefix on the remote server._
3. Use SCP to upload the files to your home directory on `web1`.
4. Use SSH to move the files into their target locations in `/var/www/html/` ensuring you drop the `backend/` portion of the path.
   // turbo

## Step 3: API Contract Verification

If you touched any files in `\backend\api`:

1. Confirm inputs like `?uuid=` and `?voter_id=` remain fully supported.
2. Verify that the JSON output structure `{ "status": "success", "data": { ... } }` remains totally consistent.
3. Ensure exact endpoint paths remain unmodified.
