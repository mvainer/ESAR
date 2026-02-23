// GalleryApp.gs — Read-only gallery served as a web app
//
// Deploy once via Apps Script UI as photos@kcesar.org:
//   Execute as: Me  |  Who has access: Anyone within kcesar.org
// Never run clasp deploy --deploymentId (breaks authorization — see Issues.md).
// To update code: clasp push → UI → Deploy → New deployment → update Sites embed URL.

function doGet() {
  return HtmlService.createHtmlOutputFromFile('gallery')
    .setTitle('ESAR Photo Albums')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function serverGetAlbums() {
  try {
    var ss  = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var tab = ss.getSheetByName(CONFIG.TAB_NAME);
    if (!tab) return { success: false, error: 'Album Directory tab not found.' };

    var lastRow = tab.getLastRow();
    if (lastRow <= 1) return { success: true, albums: [] };

    var values       = tab.getRange(2, 1, lastRow - 1, 6).getValues();  // cols 1–6
    var linkFormulas = tab.getRange(2, 5, lastRow - 1, 1).getFormulas();

    var albums = [];
    for (var i = 0; i < values.length; i++) {
      var title = values[i][1];
      if (!title) continue;

      var linkFormula = linkFormulas[i][0];
      var urlMatch    = linkFormula.match(/=HYPERLINK\("([^"]+)"/);
      var photosUrl   = urlMatch ? urlMatch[1] : String(values[i][4] || '');

      // Col 6 (index 5): data URL stored by the Chrome extension — no cross-origin auth needed.
      var thumbnail = String(values[i][5] || '');

      var dateVal   = values[i][2];
      var dateAdded = '';
      if (dateVal) {
        if (dateVal instanceof Date) {
          dateAdded = dateVal.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        } else {
          dateAdded = String(dateVal);
        }
      }

      albums.push({
        title:     String(title),
        dateAdded: dateAdded,
        photosUrl: photosUrl,
        thumbnail: thumbnail
      });
    }

    return { success: true, albums: albums };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
