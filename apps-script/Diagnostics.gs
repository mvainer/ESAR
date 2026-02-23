// Diagnostics.gs — temporary debug functions, safe to delete after use

// Returns diagnostic data as JSON — callable from the web app endpoint with ?diag=1
function serverDiag() {
  try {
    var props = PropertiesService.getScriptProperties();
    var ssId  = props.getProperty('dashboardSheetId');
    if (!ssId) return { error: 'dashboardSheetId not set' };

    var ss  = SpreadsheetApp.openById(ssId);
    var tab = ss.getSheetByName(SitesCreator.TAB_NAME);
    if (!tab) return { error: 'Tab not found: ' + SitesCreator.TAB_NAME };

    var lastRow = tab.getLastRow();
    var rawRows = [];
    if (lastRow > 0) {
      var values   = tab.getRange(1, 1, lastRow, 5).getValues();
      var formulas = tab.getRange(1, 1, lastRow, 5).getFormulas();
      for (var r = 0; r < values.length; r++) {
        rawRows.push({
          row: r + 1,
          values:   values[r],
          formulas: formulas[r]
        });
      }
    }

    var albums = SitesCreator.listAlbums();

    return { lastRow: lastRow, rawRows: rawRows, albums: albums };
  } catch(e) {
    return { error: e.message, stack: e.stack };
  }
}

function diagSheet() {
  var props = PropertiesService.getScriptProperties();
  var ssId  = props.getProperty('dashboardSheetId');
  if (!ssId) { Logger.log('ERROR: dashboardSheetId not set'); return; }

  var ss  = SpreadsheetApp.openById(ssId);
  var tab = ss.getSheetByName(SitesCreator.TAB_NAME);
  if (!tab) { Logger.log('ERROR: Tab "' + SitesCreator.TAB_NAME + '" not found'); return; }

  var lastRow = tab.getLastRow();
  Logger.log('Sheet: ' + ss.getName() + ' / tab: ' + tab.getName());
  Logger.log('lastRow = ' + lastRow);

  if (lastRow < 1) { Logger.log('Sheet is empty'); return; }

  var values       = tab.getRange(1, 1, lastRow, 5).getValues();
  var formulas     = tab.getRange(1, 1, lastRow, 5).getFormulas();

  for (var r = 0; r < values.length; r++) {
    Logger.log('--- Row ' + (r + 1) + ' ---');
    for (var c = 0; c < 5; c++) {
      var val = values[r][c];
      var fml = formulas[r][c];
      Logger.log('  col ' + (c + 1) + ': val=' + JSON.stringify(val) + '  formula=' + JSON.stringify(fml));
    }
  }

  Logger.log('=== listAlbums() result ===');
  try {
    var albums = SitesCreator.listAlbums();
    Logger.log('Count: ' + albums.length);
    albums.forEach(function(a, i) {
      Logger.log('Album ' + i + ': row=' + a.row + '  title=' + JSON.stringify(a.title) +
        '  photosUrl=' + JSON.stringify(a.photosUrl) + '  thumbnail=' + JSON.stringify(a.thumbnail));
    });
  } catch(e) {
    Logger.log('listAlbums threw: ' + e.message + '\n' + e.stack);
  }

  Logger.log('=== thumbnail fetch test ===');
  try {
    var albums2 = SitesCreator.listAlbums();
    if (albums2.length && albums2[0].thumbnail) {
      var url = albums2[0].thumbnail;
      Logger.log('Fetching: ' + url);
      var resp = UrlFetchApp.fetch(url, {
        headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
        muteHttpExceptions: true,
        followRedirects: false
      });
      Logger.log('HTTP status: ' + resp.getResponseCode());
      Logger.log('Content-Type: ' + resp.getHeaders()['Content-Type']);
    } else {
      Logger.log('No thumbnail URL to test');
    }
  } catch(e) {
    Logger.log('fetch test threw: ' + e.message);
  }
}
