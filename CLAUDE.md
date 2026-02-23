# ESAR Project — Claude Context

## On Session Start
**Always read these two files before doing any work:**
1. `Requirements.md` — full system spec, architecture, accounts, deployment IDs
2. `Issues.md` — known failure modes and fixes (consult before debugging anything)

## Standing Rules
- **Every code change → git commit + push immediately after. No exceptions.**
- **Every new deployment → `clasp undeploy` all old non-HEAD deployments. Leave no stale deployments.**
- **Always consult Issues.md before debugging deployment/auth errors.**
- **Always specify full file paths when referencing files.**

## Key Files
- `Requirements.md` — full system spec, deployment IDs, workflows
- `Issues.md` — known issues and fixes (deployment auth, "unable to open file")
- `apps-script/` — admin web app (clasp root, `.clasp.json` in repo root)
- `gallery-app/` — member-facing gallery (separate clasp project, `.clasp.json` inside)
- `chrome-extension/content.js` — holds `WEB_APP_URL` (admin app deployment ID)

## Deployment Workflow
### Admin app (from repo root)
1. `clasp push --force`
2. Apps Script UI as photos@kcesar.org → Deploy → New deployment → Web app → Execute as: Me / Anyone within kcesar.org → Authorize
3. `clasp undeploy <old-id>` for every non-HEAD old deployment
4. Update `content.js` `WEB_APP_URL` + `Requirements.md` → git commit + push

### Gallery app (from gallery-app/)
1. `cd gallery-app && clasp push --force`
2. Apps Script UI → New deployment → Authorize
3. `cd gallery-app && clasp undeploy <old-id>` for every non-HEAD old deployment
4. Update `Requirements.md` gallery URL → git commit + push
5. If URL changed: update Google Sites embed

## Critical: Web App Authorization
- `clasp deploy --deploymentId` **ALWAYS breaks** web app executor token → NEVER use it
- Any scope change in `appsscript.json` **ALSO breaks** executor token → new UI deployment required
- "No execution log" + "unable to open file" = authorization issue, not code → see Issues.md
- Both projects use `spreadsheets` scope (SpreadsheetApp requires full scope even for reads — readonly doesn't work)
- Always deploy as **photos@kcesar.org** — "Execute as: Me" uses the deploying account

## Current Deployment IDs
- Admin: `AKfycbzf2j2xVEiBFcEuQ3k7VDGNgBTuRUSrO27inCanaqr3nfAGO8_RbUUtWLdbCy73-EU`
- Gallery: `AKfycbyybOTms0cpX59fCJhpUNJ8CnegIlCH_R8rheXFjDLw2wKWAOp1Rp0LD5aw7iTcYbFNKA`

## Spreadsheet
- Name: "ESARPhotos Album Directory" — ID: `16VaQsEpmGJKaM4Jqb9YZvII5OW2uQ8x4uQv8MPCejRo`
- Tab: "Album Directory" — cols: thumbnail (IMAGE formula), title, date, unused, URL (HYPERLINK formula)
