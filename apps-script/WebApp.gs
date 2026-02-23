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
//
// The member-facing gallery is a SEPARATE Apps Script project (gallery-app/).
// Do NOT add gallery routing here — it would tie the gallery URL to this deployment.

// ── Web App Entry Point ───────────────────────────────────────────────────────

function doGet(e) {
  // Diagnostic endpoint: ?diag=1
  if (e && e.parameter && e.parameter.diag === '1') {
    var data = serverDiag();
    return ContentService.createTextOutput(JSON.stringify(data, null, 2))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return HtmlService.createHtmlOutputFromFile('webapp')
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
    var thumbnail = (album.thumbnail || '').trim(); // CDN URL → =IMAGE() formula in Sheets col 1
    var dataUrl   = (album.dataUrl   || '').trim(); // data URL → col 6 for web app display

    if (!title || !url) {
      results.push({ title: title || url || '(unknown)', status: 'error', error: 'Missing title or URL.' });
      return;
    }

    if (existingUrls[url]) {
      results.push({ title: title, status: 'duplicate' });
      return;
    }

    try {
      SitesCreator.addAlbumDirect(title, url, thumbnail, dataUrl);
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

