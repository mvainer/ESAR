// PhotosSync.gs — One-time setup
//
// Albums are now managed manually via the web app (WebApp.gs).
// This file contains only the setup function that creates the Google Sheet.

/**
 * Run this ONCE from the Apps Script editor to create the Dashboard spreadsheet.
 * After setup(), deploy the web app (Deploy → New deployment → Web app).
 */
function setup() {
  Dashboard.init();
  Logger.log('Setup complete.');
  Logger.log('Dashboard: ' + Dashboard.getUrl());
  Logger.log('');
  Logger.log('Next step: Deploy → New deployment → Web app');
  Logger.log('  Execute as: Me');
  Logger.log('  Who has access: Anyone within kcesar.org');
}
