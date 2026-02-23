// Utils.gs — Helper functions (run manually from the Apps Script editor)

/**
 * SHOW STATUS
 * Prints current configuration and directory state to the execution log.
 */
function showStatus() {
  Logger.log('=== ESARPhotos Status ===');
  Logger.log('');
  Logger.log('Sheet:');
  Logger.log('  ' + SitesCreator.getDirectoryUrl());
  Logger.log('');

  try {
    var albums = SitesCreator.listAlbums();
    Logger.log('Albums in directory: ' + albums.length);
    albums.forEach(function(a) {
      Logger.log('  [row ' + a.row + '] ' + a.title + '  →  ' + a.photosUrl);
    });
  } catch (e) {
    Logger.log('  (run setup() first to create the spreadsheet)');
  }
}

/**
 * RESET DASHBOARD
 * Clears the stored spreadsheet reference so setup() will create a fresh one.
 * Does NOT delete the existing spreadsheet — do that manually in Google Drive.
 */
function resetDashboard() {
  PropertiesService.getScriptProperties().deleteProperty('dashboardSheetId');
  Dashboard._sheet = null;
  Logger.log('Dashboard reference cleared. Run setup() to create a new spreadsheet.');
}

/**
 * POC: Can Apps Script fetch a Google Photos album page and extract the share URL?
 *
 * Replace ALBUM_ID below with any album ID from photos@kcesar.org.
 * Run from the editor — does NOT require deployment, will NOT affect the web app.
 * Check View → Execution log for results.
 *
 * What this tests:
 *   1. Whether UrlFetchApp + ScriptApp.getOAuthToken() can access photos.google.com
 *   2. Whether the album's share URL (photos.app.goo.gl/…) is in the initial HTML
 *   3. Whether targeted search near the album ID finds the right URL
 *
 * If this works → Apps Script can own share-URL collection as a background job.
 * If HTTP 401/403 → the OAuth token doesn't cover photos.google.com; extension must do it.
 * If HTTP 200 but no URL → share URL is loaded via AJAX, not in initial HTML.
 */
function testFetchAlbumShareUrl() {
  // Paste a real album ID from photos@kcesar.org here (the long string after /album/ in the URL).
  // Use one you know is already shared so there should be a photos.app.goo.gl URL in the page.
  // POC RESULT (2026-02): UrlFetchApp with ScriptApp.getOAuthToken() is redirected to the
  // Google sign-in page for photos.google.com — the site requires session cookies, not a
  // Bearer token. Apps Script CANNOT fetch album pages. Share URL collection must stay in
  // the Chrome extension (which runs in the browser with the user's session cookies).
  var ALBUM_ID = 'AF1QipNC1JpThr3l64lxFAj8ySMmUbb74zzAAyPVhGYG';

  var url = 'https://photos.google.com/u/0/album/' + ALBUM_ID;
  Logger.log('Fetching: ' + url);

  var response = UrlFetchApp.fetch(url, {
    headers: { 'Authorization': 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  });

  var code = response.getResponseCode();
  Logger.log('HTTP status: ' + code);

  if (code !== 200) {
    Logger.log('FAIL — body snippet: ' + response.getContentText().substring(0, 600));
    return;
  }

  var html = response.getContentText();
  Logger.log('Response size: ' + html.length + ' chars');

  var SHARE_RE = /https:\/\/photos\.app\.goo\.gl\/[A-Za-z0-9]+/g;

  // 1. Is the album ID present in the HTML? (confirms inline SSR data)
  var idIdx = html.indexOf(ALBUM_ID);
  Logger.log('Album ID in HTML: ' + (idIdx !== -1 ? 'YES at char ' + idIdx : 'NO'));

  // 2. Is any share URL present anywhere in the HTML?
  var allUrls = html.match(SHARE_RE) || [];
  Logger.log('All photos.app.goo.gl URLs in HTML (' + allUrls.length + '): ' + allUrls.join(', '));

  // 3. Is a share URL within 2 KB of the album ID? (the targeted search used in the extension)
  if (idIdx !== -1) {
    var nearby = html.substring(Math.max(0, idIdx - 500), idIdx + 2000);
    var nearbyMatch = nearby.match(SHARE_RE);
    Logger.log('Share URL near album ID: ' + (nearbyMatch ? nearbyMatch[0] : 'NOT FOUND'));
  }

  Logger.log('Done.');
}
