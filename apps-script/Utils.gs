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
