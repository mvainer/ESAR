# Chrome Web Store Submission — ESAR Photos: Share to Website

## Store Listing

**Name:** ESAR Photos — Share to Website

**Short description (≤132 chars):**
Add Google Photos albums to the ESAR member website directory. For authorized ESAR Photos admins only.

**Category:** Productivity

**Language:** English (US)

**Privacy policy URL:** https://docs.google.com/document/d/1pd82707k2489EgEbCO2d0QQST548XlUPUWzGLQYD0zg/edit?usp=sharing

---

## Permission Justifications

Paste these when CWS asks "Why does your extension need each permission?":

**`storage`**
Temporarily stores album title, share link, and thumbnail URL in local browser storage to pass data from the Google Photos tab to the ESAR admin web app tab. Data is deleted immediately after being read.

**`https://photos.google.com/*`**
Injects the extension UI (floating buttons and album selection panel) into Google Photos so the admin can select albums and share them to the ESAR website.

**`https://script.google.com/*`** and **`https://*.googleusercontent.com/*`**
Google Apps Script serves the ESAR admin web app inside a sandboxed iframe hosted on `script.googleusercontent.com`. The relay script must be injected into that iframe (not the outer frame) to read locally-stored album data and pre-fill the form via postMessage. Both host patterns are required because the outer frame is on `script.google.com` and the inner iframe is on `*.googleusercontent.com`.

---

## Visibility

Set to **Unlisted** — only people with the direct install link can find it.

---

## Screenshot

Take a screenshot of the album selection panel open on `photos.google.com/albums`.
Recommended size: 1280×800 or 640×400.

---

## Checklist

- [ ] Create Google Doc from `privacy-policy.md`, share as "Anyone with link → Viewer", paste URL above
- [ ] Take screenshot of extension in use
- [ ] Create `.zip`: `zip -r esar-photos-extension.zip chrome-extension/ --exclude "chrome-extension/*.md"`
- [ ] Pay $5 Chrome Web Store developer fee (one-time)
- [ ] Upload zip, set visibility to Unlisted, paste privacy policy URL, fill permission justifications
- [ ] Submit for review (~3–7 business days)
- [ ] After approval: share install link with authorized admins
