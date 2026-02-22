// WebApp.gs — Admin web interface for managing the Album Directory
//
// DEPLOY AS WEB APP (one-time, after running setup()):
//   1. Click Deploy → New deployment
//   2. Type: Web app
//   3. Execute as: Me (photos@kcesar.org)
//   4. Who has access: Anyone within kcesar.org
//   5. Click Deploy → copy the web app URL
//
// Paste that URL into chrome-extension/content.js as WEB_APP_URL.

// ── Web App Entry Point ───────────────────────────────────────────────────────

function doGet(e) {
  var params = (e && e.parameter) ? e.parameter : {};

  // JSON API endpoint: ?action=list  (used by potential future extension checks)
  if (params.action === 'list') {
    try {
      return ContentService
        .createTextOutput(JSON.stringify({ success: true, albums: SitesCreator.listAlbums() }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // HTML web app — pass single-album pre-fill values from the extension
  var template = HtmlService.createTemplateFromFile('webapp');
  template.prefillTitle = params.title || '';
  template.prefillUrl   = params.url   || '';

  return template.evaluate()
    .setTitle('ESAR Photos — Album Directory')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ── Server-Side Functions (called via google.script.run) ──────────────────────

/**
 * Add a single album.
 * Returns { success: true } or { success: false, error: 'duplicate' | '...' }
 */
function serverAddAlbum(title, photosUrl, thumbnailUrl) {
  try {
    title        = (title        || '').trim();
    photosUrl    = (photosUrl    || '').trim();
    thumbnailUrl = (thumbnailUrl || '').trim();

    if (!title)     return { success: false, error: 'Album title is required.' };
    if (!photosUrl) return { success: false, error: 'Google Photos URL is required.' };

    var existing = SitesCreator.listAlbums();
    for (var i = 0; i < existing.length; i++) {
      if (existing[i].photosUrl === photosUrl) {
        return { success: false, error: 'duplicate' };
      }
    }

    SitesCreator.addAlbumDirect(title, photosUrl, thumbnailUrl);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Add multiple albums at once (bulk submit from the Chrome extension panel).
 *
 * @param {string} albumsJson  JSON string: [{title, url, thumbnail}, ...]
 * @returns {{ results: Array<{title, status, error}> }}
 *   status is one of: 'added' | 'duplicate' | 'error'
 */
function serverAddAlbumsBulk(albumsJson) {
  try {
    var albums = JSON.parse(albumsJson);
  } catch (e) {
    return { success: false, error: 'Invalid album data.' };
  }

  // Load the existing album list once — avoids N Sheet reads
  var existing = SitesCreator.listAlbums();
  var existingUrls = {};
  existing.forEach(function(a) { existingUrls[a.photosUrl] = true; });

  var results = [];

  albums.forEach(function(album) {
    var title     = (album.title     || '').trim();
    var url       = (album.url       || '').trim();
    var thumbnail = (album.thumbnail || '').trim();

    if (!title || !url) {
      results.push({ title: title || url || '(unknown)', status: 'error', error: 'Missing title or URL.' });
      return;
    }

    if (existingUrls[url]) {
      results.push({ title: title, status: 'duplicate' });
      return;
    }

    try {
      SitesCreator.addAlbumDirect(title, url, thumbnail);
      existingUrls[url] = true;  // update local cache so duplicates within the batch are caught
      results.push({ title: title, status: 'added' });
    } catch (err) {
      results.push({ title: title, status: 'error', error: err.message });
    }
  });

  return { success: true, results: results };
}

/**
 * Return all albums currently in the directory.
 */
function serverGetAlbums() {
  try {
    return { success: true, albums: SitesCreator.listAlbums() };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Remove the album at the given sheet row number.
 */
function serverRemoveAlbum(row) {
  try {
    SitesCreator.removeAlbumByRow(row);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
