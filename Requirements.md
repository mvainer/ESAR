# ESAR Photos — Requirements

## Overview
ESAR (King County Search and Rescue) uses Google Workspace. The admin (photos@kcesar.org)
manages a directory of Google Photos albums that are published to the ESAR website for members
to browse. This system consists of a Chrome extension (for the admin) and a Google Apps Script
web app (backend + member gallery).

## Key Accounts & Sites
| Account | Role |
|---------|------|
| photos@kcesar.org | Photos admin — runs Chrome extension, owns Apps Script web app, sole authorized user of admin web app |
| moshe.vainer@kcesar.org | Has edit rights on the ESAR Google Sites (Members area) |

- Public website: https://kcesar.org (Next.js — no programmatic page creation)
- Members area: Google Sites (New Google Sites, kcesar.org domain, accessible to kcesar.org members only)
  - Edit URL: https://sites.google.com/d/1q17C9SkCbfoP-CMfSmjS8lz3iP-k999W/p/1Ps_LFj2iQAO__kJjfI-NmGR_G-Xpx8u8/edit
  - Gallery embed goes on a "Photo Albums" page (Insert → Embed → gallery URL)
  - Admin web app is NOT embedded in Google Sites — accessed via Chrome extension or bookmark
- New Google Sites has **no API** for programmatic page creation — any page/embed setup must be done manually by moshe.vainer@kcesar.org in the Sites editor

---

## Access Control — CRITICAL

### Admin Web App (apps-script/)
- Deployment: **Execute as: Me (photos@kcesar.org) / Who has access: Anyone within kcesar.org**
- The URL is only shared with the photos admin — it is not embedded in Google Sites
- Do NOT add OAuth scopes beyond `spreadsheets` — any scope change requires a full UI re-deployment
- Do NOT use `ScriptApp.getService()` — requires `script.scriptapp` scope which breaks the web app

### Gallery App (gallery-app/)
- Separate read-only Apps Script project — URL is stable and never changes when the admin app redeploys
- Deployment: **Execute as: Me (photos@kcesar.org) / Who has access: Anyone within kcesar.org**
- Uses `spreadsheets` scope (Apps Script's SpreadsheetApp service requires read-write scope even for reads)
- This is the URL embedded in Google Sites

### Chrome Extension
- Used exclusively by the admin (photos@kcesar.org)
- Runs only on `photos.google.com`

---

## Album Share Links

- Member-facing links MUST use `photos.app.goo.gl/…` format (share links)
- `photos.google.com/album/…` links are admin-only and do NOT work for regular members
- The Chrome extension auto-captures the share link by watching the DOM when the admin opens the Google Photos Share dialog

---

## Chrome Extension Behavior

### Single album page (`/album/…`)
1. Shows a floating "📷 Share to ESAR Website" button (FAB) in the bottom-right corner
2. Clicking opens a modal card with:
   - **Album Title** field (pre-filled from page title)
   - **Member Share Link** field (auto-fills when admin opens the Share dialog in Google Photos via MutationObserver watching for `photos.app.goo.gl` URLs in the DOM)
3. "Send to ESAR Website" button stores data in `chrome.storage.local` and opens the web app in a new tab

### Albums list page (`/albums`)
1. Shows a floating "☰ Select Albums for ESAR Website" FAB
2. Clicking opens a right-side panel listing all visible albums with checkboxes
3. "Select all / Deselect all / Refresh" toolbar controls
4. Refresh re-scrapes albums (needed when user scrolls to load more)
5. "Add N Albums to Website" button stores selected albums in `chrome.storage.local` and opens the web app (bulk mode)

### Data passing
- Uses `chrome.storage.local` (not URL hash) — hash fragments are stripped by Google auth redirects
- Single album key: `esar_pending_album` → `{ title, url }`
- Bulk albums key: `esar_pending_bulk` → `[{ title, url, thumbnail }, …]`
- `relay.js` content script (injected into the web app iframe) reads storage and forwards via `postMessage`

---

## Web App — Admin Interface

### Add Album form
- Fields: Album Title (required), Share Link / `photos.app.goo.gl` URL (required), Cover Photo URL (optional)
- Duplicate detection: checks existing albums before adding; shows banner if pre-filled URL already exists
- Pre-fill: populated automatically from Chrome extension via `postMessage` from `relay.js`

### Bulk add view
- Shown when web app is opened with bulk album data
- Calls `serverAddAlbumsBulk` with all selected albums
- Shows summary: added / already on site / errors
- Per-row result list with status icons

### Album directory table
- Lists all current albums: title, date added, link, remove button
- Remove button calls `serverRemoveAlbum(row)` with the spreadsheet row number

---

## Gallery App — Member-Facing Gallery

- Separate Apps Script project in `gallery-app/` — deployed independently of the admin app
- Stable URL: `https://script.google.com/a/macros/kcesar.org/s/AKfycbyybOTms0cpX59fCJhpUNJ8CnegIlCH_R8rheXFjDLw2wKWAOp1Rp0LD5aw7iTcYbFNKA/exec`
- Reads directly from the spreadsheet by hardcoded ID — no dependency on the admin app URL
- Responsive card grid: `repeat(auto-fill, minmax(260px, 1fr))`
- Each card shows: 200px thumbnail (or placeholder), album title, date added, "📷 View Album" chip
- Entire card is a link to the `photos.app.goo.gl` share URL, opens in new tab
- Embedded in Google Sites (Insert → Embed → paste the URL above)
- **Deploy workflow (code update):** `cd gallery-app && clasp push --force` → Apps Script UI → New deployment → authorize → update Sites embed URL if changed

---

## Spreadsheet Schema (Album Directory tab)

| Col | Content | Format |
|-----|---------|--------|
| 1 | Thumbnail | `=IMAGE("url",1)` formula |
| 2 | Album title | plain text |
| 3 | Date added | plain text |
| 4 | (unused) | — |
| 5 | Photos share URL | `=HYPERLINK("url","View Album")` formula |

`SitesCreator.listAlbums()` extracts URLs from these formulas via regex.

---

## Deployment

### Admin App (apps-script/)
- Production deployment ID: `AKfycbzf2j2xVEiBFcEuQ3k7VDGNgBTuRUSrO27inCanaqr3nfAGO8_RbUUtWLdbCy73-EU`
- Production URL: `https://script.google.com/a/macros/kcesar.org/s/AKfycbzf2j2xVEiBFcEuQ3k7VDGNgBTuRUSrO27inCanaqr3nfAGO8_RbUUtWLdbCy73-EU/exec`
- **Deploy workflow (code update):**
  1. `clasp push --force` (from repo root — uses root `.clasp.json`)
  2. Apps Script UI as photos@kcesar.org → Deploy → New deployment → Web app → Execute as: Me / Anyone within kcesar.org → Deploy → Authorize
  3. Update deployment ID in `content.js`, `Requirements.md` → reload Chrome extension

### Gallery App (gallery-app/)
- Deployment ID: `AKfycbyybOTms0cpX59fCJhpUNJ8CnegIlCH_R8rheXFjDLw2wKWAOp1Rp0LD5aw7iTcYbFNKA`
- URL: `https://script.google.com/a/macros/kcesar.org/s/AKfycbyybOTms0cpX59fCJhpUNJ8CnegIlCH_R8rheXFjDLw2wKWAOp1Rp0LD5aw7iTcYbFNKA/exec`
- **Deploy workflow (code update):**
  1. `cd gallery-app && clasp push --force`
  2. Apps Script UI → New deployment → authorize → update Sites embed URL

### Both Projects
- **NEVER run `clasp deploy --deploymentId`** — invalidates web app authorization (see Issues.md)
- **NEVER deploy as moshe.vainer@kcesar.org** — "Execute as: Me" uses the deploying account
- **Do not use `ScriptApp.getService()`** or any method requiring `script.scriptapp` scope
- When web app shows "Sorry, unable to open the file" with no execution log → see Issues.md diagnostic checklist

---

## File Structure

```
ESAR/
├── Requirements.md                  ← this file
├── Issues.md                        ← known issues and fixes
├── apps-script/                     ← Admin web app (clasp rootDir)
│   ├── appsscript.json              ← manifest: spreadsheets scope only
│   ├── Config.gs                    ← SHEET_NAME constant
│   ├── WebApp.gs                    ← doGet, server-side functions
│   ├── SitesCreator.gs              ← listAlbums, addAlbumDirect, removeAlbumByRow
│   ├── Dashboard.gs                 ← sync log sheet
│   ├── PhotosSync.gs                ← setup() only (legacy trigger removed)
│   ├── Utils.gs                     ← helper functions
│   └── webapp.html                  ← admin UI
├── gallery-app/                     ← Member-facing gallery (separate clasp project)
│   ├── appsscript.json              ← manifest: spreadsheets.readonly scope only
│   ├── Config.gs                    ← hardcoded spreadsheet ID + tab name
│   ├── GalleryApp.gs                ← doGet + serverGetAlbums
│   └── gallery.html                 ← responsive album card grid
└── chrome-extension/
    ├── manifest.json                ← MV3 manifest
    ├── content.js                   ← injected into photos.google.com
    └── relay.js                     ← injected into web app iframe, forwards storage via postMessage
```
