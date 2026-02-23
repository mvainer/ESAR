# Privacy Policy — ESAR Photos: Share to Website

**Last updated:** 2026-02-22

## Overview
This Chrome extension is an internal tool for authorized ESAR (King County Search and Rescue) Photos administrators. It is not intended for general public use.

## Data Collected
This extension does **not** collect, transmit, or store any personal data on external servers.

## How the Extension Works
1. On `photos.google.com`: the extension reads album titles and thumbnail URLs visible in the current browser tab (already loaded by Google Photos). This data never leaves your browser except as described below.
2. When you choose to add an album: the album title, Google Photos share link, and thumbnail URL are temporarily stored in `chrome.storage.local` (local to your browser, not synced).
3. The extension opens the ESAR admin web app (a Google Apps Script deployed within the `kcesar.org` Google Workspace domain). A relay script reads the locally-stored album data and passes it to the web app via `postMessage` so the form can be pre-filled.
4. After the data is relayed, it is immediately deleted from `chrome.storage.local`.

## Data Sharing
No data is shared with any third party. Album data is only passed to the ESAR admin web app (`script.google.com`, within the `kcesar.org` domain), which is operated by the ESAR Photos administrator.

## Permissions Used
| Permission | Reason |
|-----------|--------|
| `storage` | Temporarily holds album data between the Google Photos tab and the ESAR admin web app tab |
| `https://photos.google.com/*` | Injects the extension UI (buttons and panel) into Google Photos |
| `https://script.google.com/*` | Injects the relay script to read locally-stored album data and pre-fill the admin web app form |
| `https://*.googleusercontent.com/*` | Google Apps Script serves the web app inside an iframe on this domain; the relay script must run inside that iframe |

## Contact
For questions, contact the ESAR Photos administrator at photos@kcesar.org.
