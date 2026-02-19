// PhotosSync.gs — Core sync logic and trigger management

var PHOTOS_API = 'https://photoslibrary.googleapis.com/v1';
var SEEN_KEY   = 'seenAlbumIds';  // PropertiesService key for persisting seen album IDs

// ── One-time Setup ────────────────────────────────────────────────────────────

/**
 * Run this ONCE from the Apps Script editor to:
 *   1. Register the hourly time-based trigger
 *   2. Create the Google Sheet dashboard
 *
 * Re-run after changing CONFIG.SYNC_INTERVAL_HOURS to update the trigger.
 */
function setup() {
  // Remove existing triggers for this function to avoid duplicates
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === CONFIG.TRIGGER_FUNCTION) {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Register new time-based trigger
  ScriptApp.newTrigger(CONFIG.TRIGGER_FUNCTION)
    .timeBased()
    .everyHours(CONFIG.SYNC_INTERVAL_HOURS)
    .create();

  // Create dashboard sheet
  Dashboard.init();

  Logger.log('Setup complete.');
  Logger.log('Sync will run every ' + CONFIG.SYNC_INTERVAL_HOURS + ' hour(s).');
  Logger.log('Dashboard: ' + Dashboard.getUrl());
}

/**
 * Remove all registered triggers.
 * Run this before changing SYNC_INTERVAL_HOURS, then re-run setup().
 */
function teardown() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    ScriptApp.deleteTrigger(t);
  });
  Logger.log('All triggers removed.');
}

// ── Main Sync ─────────────────────────────────────────────────────────────────

/**
 * Entry point called by the time-based trigger (and available for manual runs).
 * Fetches all Google Photos albums, finds new ones, creates Sites pages, updates index.
 */
function syncPhotos() {
  var token = getPhotosToken(); // from PhotosAuth.gs — uses OAuth2 library

  // 1. Fetch all albums from Google Photos
  var allAlbums;
  try {
    allAlbums = fetchAllAlbums(token);
  } catch (err) {
    Dashboard.log('ERROR', '', '', '', 'Photos API error: ' + err.message);
    throw err;
  }

  // 2. Determine which albums are new (not yet seen)
  var props   = PropertiesService.getScriptProperties();
  var seenRaw = props.getProperty(SEEN_KEY);
  var seenIds = seenRaw ? JSON.parse(seenRaw) : [];
  var seenSet = {};
  seenIds.forEach(function(id) { seenSet[id] = true; });

  var newAlbums = allAlbums.filter(function(a) { return !seenSet[a.id]; });

  Dashboard.log(
    'INFO', '', '', '',
    'Sync started. Total albums: ' + allAlbums.length + ', new: ' + newAlbums.length
  );

  if (newAlbums.length === 0) {
    Dashboard.log('INFO', '', '', '', 'No new albums found. Sync finished.');
    return;
  }

  // 3. Add each new album to the Sheet directory
  var created = 0;
  newAlbums.forEach(function(album) {
    try {
      var photosUrl = SitesCreator.addAlbum(album);
      seenIds.push(album.id);
      created++;
      Dashboard.log('CREATED', album.title, photosUrl, photosUrl, '');
    } catch (err) {
      Dashboard.log('ERROR', album.title, album.productUrl || '', '', err.message);
    }
  });

  // 4. Persist updated seen IDs
  props.setProperty(SEEN_KEY, JSON.stringify(seenIds));
  Dashboard.log('INFO', '', '', '', 'Sync finished. ' + created + ' album(s) added to directory.');
  Logger.log('Album Directory: ' + SitesCreator.getDirectoryUrl());
}

// ── Google Photos API ─────────────────────────────────────────────────────────

/**
 * Fetch every album in the account, following nextPageToken pagination.
 * Returns an array of album objects from the Photos Library API.
 */
function fetchAllAlbums(token) {
  var albums    = [];
  var pageToken = null;

  do {
    var url = PHOTOS_API + '/albums?pageSize=50';
    if (pageToken) url += '&pageToken=' + encodeURIComponent(pageToken);

    var response = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + token },
      muteHttpExceptions: true
    });

    var code = response.getResponseCode();
    if (code !== 200) {
      throw new Error('HTTP ' + code + ': ' + response.getContentText());
    }

    var data = JSON.parse(response.getContentText());
    if (data.albums) {
      data.albums.forEach(function(a) { albums.push(a); });
    }
    pageToken = data.nextPageToken || null;

  } while (pageToken);

  return albums;
}
