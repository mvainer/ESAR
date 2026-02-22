// SitesCreator.gs — Album directory maintained as a Google Sheet tab
//
// The "Album Directory" tab in the Dashboard spreadsheet serves as the live
// album index. Embed it in Google Sites once (Insert → Sheets), and it
// updates automatically whenever albums are added or removed via the web app.
//
// EMBED IN GOOGLE SITES (one-time, manual):
//   1. Open your Google Sites page in the editor
//   2. Click Insert → Sheets
//   3. Select the "ESARPhotos Sync Log" spreadsheet
//   4. Choose the "Album Directory" tab
//   5. Click Insert — the directory will update live on the site

var SitesCreator = {

  TAB_NAME: 'Album Directory',

  // ── Sheet Access ─────────────────────────────────────────────────────────

  getOrCreateTab: function() {
    var props = PropertiesService.getScriptProperties();
    var ssId  = props.getProperty('dashboardSheetId');

    if (!ssId) {
      throw new Error('Dashboard spreadsheet not found. Run setup() first.');
    }

    var ss  = SpreadsheetApp.openById(ssId);
    var tab = ss.getSheetByName(SitesCreator.TAB_NAME);

    if (!tab) {
      tab = ss.insertSheet(SitesCreator.TAB_NAME);
      SitesCreator._initTab(tab);
    }

    return tab;
  },

  _initTab: function(tab) {
    tab.appendRow(['', 'Album', 'Date Added', 'Photos', 'View Album (read-only link)']);

    var header = tab.getRange(1, 1, 1, 5);
    header.setFontWeight('bold');
    header.setBackground('#1a73e8');
    header.setFontColor('#ffffff');
    header.setFontSize(11);

    tab.setColumnWidth(1, 100);  // Thumbnail
    tab.setColumnWidth(2, 240);  // Album title
    tab.setColumnWidth(3, 120);  // Date
    tab.setColumnWidth(4,  70);  // Photo count
    tab.setColumnWidth(5, 200);  // Link

    tab.setFrozenRows(1);
    tab.setRowHeight(1, 32);
  },

  // ── Add Album ─────────────────────────────────────────────────────────────

  /**
   * Add a new album row submitted via the admin web app.
   *
   * @param {string} title        Album title
   * @param {string} photosUrl    Google Photos share link (photos.app.goo.gl/...)
   * @param {string} thumbnailUrl Optional cover photo URL (right-click cover → Copy image address)
   * @returns {string} The photosUrl that was saved
   */
  addAlbumDirect: function(title, photosUrl, thumbnailUrl) {
    var tab = SitesCreator.getOrCreateTab();

    var dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });

    var newRow = tab.getLastRow() + 1;
    tab.setRowHeight(newRow, thumbnailUrl ? 90 : 40);

    if (thumbnailUrl) {
      tab.getRange(newRow, 1).setFormula('=IMAGE("' + thumbnailUrl + '",1)');
    }

    tab.getRange(newRow, 2).setValue(title).setFontWeight('bold').setVerticalAlignment('middle');
    tab.getRange(newRow, 3).setValue(dateStr).setVerticalAlignment('middle');
    tab.getRange(newRow, 4).setVerticalAlignment('middle');

    if (photosUrl) {
      tab.getRange(newRow, 5)
        .setFormula('=HYPERLINK("' + photosUrl + '","📷 View Album")')
        .setFontColor('#1a73e8')
        .setVerticalAlignment('middle');
    }

    if (newRow % 2 === 0) {
      tab.getRange(newRow, 1, 1, 5).setBackground('#f8f9fa');
    }

    return photosUrl;
  },

  // ── List Albums ───────────────────────────────────────────────────────────

  /**
   * Return all album rows as objects for the admin web app.
   * Each item: { row, title, dateAdded, photosUrl }
   */
  listAlbums: function() {
    var tab     = SitesCreator.getOrCreateTab();
    var lastRow = tab.getLastRow();
    if (lastRow <= 1) return [];

    var values   = tab.getRange(2, 1, lastRow - 1, 5).getValues();
    var formulas = tab.getRange(2, 5, lastRow - 1, 1).getFormulas();

    var albums = [];
    for (var i = 0; i < values.length; i++) {
      var title = values[i][1];
      if (!title) continue;  // skip blank rows

      // Extract URL from =HYPERLINK("url","label") formula
      var formula  = formulas[i][0];
      var urlMatch = formula.match(/=HYPERLINK\("([^"]+)"/);
      var photosUrl = urlMatch ? urlMatch[1] : String(values[i][4] || '');

      albums.push({
        row:       i + 2,
        title:     String(title),
        dateAdded: String(values[i][2] || ''),
        photosUrl: photosUrl
      });
    }

    return albums;
  },

  // ── Remove Album ──────────────────────────────────────────────────────────

  /**
   * Delete the album at the given 1-indexed sheet row.
   */
  removeAlbumByRow: function(row) {
    var tab = SitesCreator.getOrCreateTab();
    if (row <= 1) throw new Error('Cannot delete the header row.');
    tab.deleteRow(row);
  },

  // ── URL Helper ────────────────────────────────────────────────────────────

  getDirectoryUrl: function() {
    var props = PropertiesService.getScriptProperties();
    var ssId  = props.getProperty('dashboardSheetId');
    return ssId
      ? 'https://docs.google.com/spreadsheets/d/' + ssId
      : '(not created yet — run setup())';
  }
};
