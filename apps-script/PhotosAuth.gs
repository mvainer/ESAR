// PhotosAuth.gs — OAuth2 authentication for Google Photos Library API
//
// The Photos Library API scope (photoslibrary.readonly) is not supported by
// Apps Script's built-in ScriptApp.getOAuthToken(). This file uses the
// OAuth2 Apps Script library to handle Photos authentication separately.
//
// SETUP (one-time, in order):
//   1. Add the OAuth2 library to this project (see instructions below)
//   2. Create a Web Application OAuth client in Google Cloud Console
//   3. Store CLIENT_ID + CLIENT_SECRET in Script Properties
//   4. Run authorizePhotos() and visit the URL it logs
//   5. Run authorizePhotos() again to confirm success

// ── OAuth2 Service ────────────────────────────────────────────────────────────

function getPhotosService() {
  var props        = PropertiesService.getScriptProperties();
  var clientId     = props.getProperty('PHOTOS_CLIENT_ID');
  var clientSecret = props.getProperty('PHOTOS_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing credentials. In Apps Script → Project Settings → Script Properties, ' +
      'add PHOTOS_CLIENT_ID and PHOTOS_CLIENT_SECRET from your Google Cloud Console ' +
      'Web Application OAuth client.'
    );
  }

  return OAuth2.createService('GooglePhotos')
    .setAuthorizationBaseUrl('https://accounts.google.com/o/oauth2/auth')
    .setTokenUrl('https://oauth2.googleapis.com/token')
    .setClientId(clientId)
    .setClientSecret(clientSecret)
    .setCallbackFunction('photosAuthCallback')
    .setPropertyStore(PropertiesService.getUserProperties())
    .setScope('https://www.googleapis.com/auth/photoslibrary.readonly')
    .setParam('access_type', 'offline')
    .setParam('prompt', 'consent');
}

// ── OAuth2 Callback ───────────────────────────────────────────────────────────

// This function is called by Google after the user authorizes the app.
// It must be deployed as a web app for the redirect to work.
function photosAuthCallback(request) {
  var service    = getPhotosService();
  var authorized = service.handleCallback(request);

  if (authorized) {
    return HtmlService.createHtmlOutput(
      '<h2 style="font-family:sans-serif;color:#188038;">Authorization successful!</h2>' +
      '<p style="font-family:sans-serif;">Google Photos access has been granted. ' +
      'You can close this tab and return to Apps Script.</p>'
    );
  } else {
    return HtmlService.createHtmlOutput(
      '<h2 style="font-family:sans-serif;color:#d93025;">Authorization denied.</h2>' +
      '<p style="font-family:sans-serif;">Please close this tab and try running authorizePhotos() again.</p>'
    );
  }
}

// ── User-facing Auth Functions ────────────────────────────────────────────────

/**
 * Run this to start the Google Photos authorization flow.
 * It logs a URL — visit that URL in your browser to grant access.
 * After visiting, run this again to confirm authorization succeeded.
 */
function authorizePhotos() {
  var service = getPhotosService();

  if (service.hasAccess()) {
    Logger.log('✓ Google Photos is already authorized. No action needed.');
    Logger.log('  To re-authorize, run revokePhotosAuth() first, then run this again.');
    return;
  }

  var authUrl = service.getAuthorizationUrl();
  Logger.log('=== Google Photos Authorization Required ===');
  Logger.log('');
  Logger.log('1. Copy and open this URL in your browser:');
  Logger.log('');
  Logger.log(authUrl);
  Logger.log('');
  Logger.log('2. Sign in with the Google account that owns the Photos library.');
  Logger.log('3. Click Allow.');
  Logger.log('4. You will see "Authorization successful!" — then close that tab.');
  Logger.log('5. Run authorizePhotos() again to confirm.');
}

/**
 * Revoke Google Photos authorization.
 * Run this if you need to re-authorize with a different account.
 */
function revokePhotosAuth() {
  getPhotosService().reset();
  Logger.log('Google Photos authorization revoked.');
  Logger.log('Run authorizePhotos() to re-authorize.');
}

// ── Token Access (used by PhotosSync.gs) ─────────────────────────────────────

/**
 * Returns a valid access token for the Photos Library API.
 * The OAuth2 library automatically refreshes expired tokens.
 */
function getPhotosToken() {
  var service = getPhotosService();

  if (!service.hasAccess()) {
    throw new Error(
      'Google Photos not authorized. Run authorizePhotos() and follow the instructions in the log.'
    );
  }

  return service.getAccessToken();
}
