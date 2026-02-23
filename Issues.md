# ESAR — Known Issues & Resolutions

## Issue 1: "Sorry, unable to open the file at this time" — Web App Fails Silently

**Symptom**
- Accessing the web app `/exec` URL shows Google Drive error: "Sorry, unable to open the file at this time"
- **No execution log at all** in Apps Script (key diagnostic: if doGet had a bug, it would log; no log = script never even started)
- Functions run fine from the Apps Script editor

**Root Causes**

### A) Deployment created via `clasp deploy` without prior UI authorization
`clasp deploy` creates a deployment record but does NOT trigger the OAuth consent flow that establishes the **web app executor token** (separate from editor/function tokens). The web app silently fails.

**Fix:** Create the initial deployment via the Apps Script UI as `photos@kcesar.org`:
1. Deploy → New deployment → Web app
2. Execute as: Me (photos@kcesar.org)
3. Who has access: Anyone within kcesar.org
4. Click Deploy → **Authorize access** when prompted
5. Copy the new deployment ID → update `chrome-extension/content.js` and `Requirements.md`
6. From then on, use `clasp deploy --deploymentId <id>` for all subsequent code updates

### B) `clasp deploy --deploymentId` run after a UI deployment
Even without scope changes, running `clasp deploy --deploymentId X` on a UI-created deployment invalidates the web app executor authorization. The code version pointer is updated via API but the OAuth consent flow is never triggered, leaving the executor token stale.

**Fix:** After each `clasp push --force`, update the deployment through the **Apps Script UI** instead of clasp:
1. Deploy → Manage deployments → pencil icon on the existing deployment
2. Change version to the latest from the dropdown → Update → authorize if prompted (same URL preserved)
3. If version update isn't available, use Deploy → New deployment → update `content.js` with new URL

**Correct deployment workflow going forward:**
1. `clasp push --force` — push code
2. Apps Script UI → Deploy → Manage deployments → Edit → update version → re-authorize
3. Never run `clasp deploy --deploymentId` again after the initial UI deployment

### C) OAuth scope change in `appsscript.json`
ANY change to `oauthScopes` — adding OR removing a scope — invalidates the web app executor token. The web app fails even if the editor works fine.

**Fix:** Re-create deployment via UI (same steps as above). Then update the deployment ID everywhere.

**Prevention:** Keep scopes to minimum (`spreadsheets` only). Do NOT add scopes speculatively. If a new scope is genuinely needed, plan the UI re-authorization step explicitly.

**Lesson:** `Session.getActiveUser().getEmail()` requires `userinfo.email` scope. Adding it broke the web app because we didn't go through the UI re-authorization step. The email check was removed — access control is currently routing-based (`?view=gallery` vs base URL).

---

## Issue 2: "You do not have permission to call SpreadsheetApp.openById" — Stale Executor Token After Scope Change

**Symptom**
- Web app loads (execution log IS present), but returns: `"You do not have permission to call SpreadsheetApp.openById. Required permissions: https://www.googleapis.com/auth/spreadsheets"`
- Running the function from the Apps Script editor works fine (no auth prompt, no error)

**Root Cause**
The web app executor token is cached with an old scope (e.g. `spreadsheets.readonly`). When the scope was updated in `appsscript.json` and a new deployment was created via UI, Google detected that the account already had partial authorization and skipped the consent prompt — leaving the executor token using the old scope.

**Fix**
1. As **photos@kcesar.org**, go to [myaccount.google.com/permissions](https://myaccount.google.com/permissions)
2. Find the affected project (e.g. "ESAR Gallery") → **Remove access**
3. In Apps Script → **Deploy → New deployment → Web app** → Execute as: Me / Anyone within kcesar.org → Deploy
4. The **"Authorize access"** dialog will now appear — complete it
5. Update deployment ID in `Requirements.md` → `clasp undeploy` old deployments → git commit + push

**Why running from the editor didn't help**
Editor tokens and web app executor tokens are completely separate OAuth grants. Authorizing in the editor never affects the web app executor.

---

## Diagnostic Checklist for "unable to open file"

1. **No execution log?** → Deployment/authorization issue (not code). Go to step 2.
2. **Check deployment settings** in Apps Script UI → Manage deployments:
   - Execute as: Me (photos@kcesar.org)?
   - Who has access: Anyone within kcesar.org?
3. **Did `appsscript.json` scopes change recently?** → Must re-create deployment via UI.
4. **Was deployment created only via `clasp deploy`?** → Must re-create via UI.
5. **Execution log present but error?** → Code issue, check the log.
