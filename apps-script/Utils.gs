// Utils.gs — Helper functions (run manually from the Apps Script editor)

/**
 * TEST SYNC
 * Runs one sync cycle immediately.
 * Safe to use — will add new albums to the Sheet directory if any are found.
 */
function testSync() {
  Logger.log('Running manual sync...');
  syncPhotos();
  Logger.log('Done. Album Directory: ' + SitesCreator.getDirectoryUrl());
}

/**
 * RESET SEEN ALBUMS
 * Clears the list of albums that have already been added to the directory.
 *
 * WARNING: The next sync will treat ALL albums as new and add rows for each one.
 * Only use this to republish from scratch or after the Sheet was deleted.
 */
function resetSeenAlbums() {
  PropertiesService.getScriptProperties().deleteProperty('seenAlbumIds');
  Logger.log('Seen album list cleared.');
  Logger.log('The next sync will add all albums to the directory as new entries.');
}

/**
 * RESET DASHBOARD
 * Clears the reference to the dashboard sheet so a new one is created on next sync.
 * Does NOT delete the existing sheet — delete it manually from Google Drive if needed.
 */
function resetDashboard() {
  PropertiesService.getScriptProperties().deleteProperty('dashboardSheetId');
  Dashboard._sheet = null;
  Logger.log('Dashboard reference cleared. A new sheet will be created on next setup() or sync.');
}

/**
 * SHOW STATUS
 * Prints current configuration and sync state to the execution log.
 */
function showStatus() {
  Logger.log('=== ESARPhotos Sync Status ===');
  Logger.log('');
  Logger.log('Config:');
  Logger.log('  SYNC_INTERVAL_HOURS: ' + CONFIG.SYNC_INTERVAL_HOURS);
  Logger.log('');

  var props   = PropertiesService.getScriptProperties();
  var seenRaw = props.getProperty('seenAlbumIds');
  var seenIds = seenRaw ? JSON.parse(seenRaw) : [];
  Logger.log('State:');
  Logger.log('  Albums in directory: ' + seenIds.length);
  Logger.log('  Spreadsheet URL    : ' + SitesCreator.getDirectoryUrl());
  Logger.log('');

  var triggers    = ScriptApp.getProjectTriggers();
  var syncTrigger = triggers.filter(function(t) {
    return t.getHandlerFunction() === CONFIG.TRIGGER_FUNCTION;
  });
  Logger.log('Trigger:');
  Logger.log(syncTrigger.length > 0
    ? '  Status: ACTIVE (' + syncTrigger.length + ' trigger registered)'
    : '  Status: NOT SET — run setup() to register the trigger'
  );
}
