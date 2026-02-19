// SitesCreator.gs — Album directory maintained as a Google Sheet tab
//
// SitesApp (Classic Google Sites API) is not available for New Google Sites.
// Instead, this module manages a "Album Directory" tab in the Dashboard spreadsheet.
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
    // Header row
    tab.appendRow(['', 'Album', 'Date Added', 'Photos', 'View Album (read-only link)']);

    var header = tab.getRange(1, 1, 1, 5);
    header.setFontWeight('bold');
    header.setBackground('#1a73e8');
    header.setFontColor('#ffffff');
    header.setFontSize(11);

    // Column widths
    tab.setColumnWidth(1, 100);  // Thumbnail
    tab.setColumnWidth(2, 240);  // Album title
    tab.setColumnWidth(3, 120);  // Date
    tab.setColumnWidth(4,  70);  // Photo count
    tab.setColumnWidth(5, 200);  // Link

    tab.setFrozenRows(1);

    // Default row height for data rows — tall enough for thumbnails
    tab.setRowHeight(1, 32);
  },

  // ── Add Album Row ─────────────────────────────────────────────────────────

  /**
   * Add a new row to the Album Directory tab for a newly detected album.
   * Returns the Google Photos URL (the read-only link for members).
   */
  addAlbum: function(album) {
    var tab      = SitesCreator.getOrCreateTab();
    var coverUrl = album.coverPhotoBaseUrl
      ? album.coverPhotoBaseUrl + '=w120-h120-c'
      : '';
    var photosUrl = album.productUrl || '';
    var title     = album.title || 'Untitled Album';
    var count     = album.mediaItemsCount || 0;
    var dateStr   = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });

    var newRow = tab.getLastRow() + 1;
    tab.setRowHeight(newRow, 90);

    // Thumbnail via IMAGE formula (scales to fill cell)
    if (coverUrl) {
      tab.getRange(newRow, 1).setFormula('=IMAGE("' + coverUrl + '",1)');
    }

    // Album title
    tab.getRange(newRow, 2).setValue(title).setFontWeight('bold').setVerticalAlignment('middle');

    // Date added
    tab.getRange(newRow, 3).setValue(dateStr).setVerticalAlignment('middle');

    // Photo count
    tab.getRange(newRow, 4).setValue(count).setHorizontalAlignment('center').setVerticalAlignment('middle');

    // Read-only Google Photos link
    if (photosUrl) {
      tab.getRange(newRow, 5)
        .setFormula('=HYPERLINK("' + photosUrl + '","📷 View Album")')
        .setFontColor('#1a73e8')
        .setVerticalAlignment('middle');
    }

    // Alternating row background
    if (newRow % 2 === 0) {
      tab.getRange(newRow, 1, 1, 5).setBackground('#f8f9fa');
    }

    return photosUrl;
  },

  // ── Get Sheet URL ─────────────────────────────────────────────────────────

  getDirectoryUrl: function() {
    var props = PropertiesService.getScriptProperties();
    var ssId  = props.getProperty('dashboardSheetId');
    return ssId
      ? 'https://docs.google.com/spreadsheets/d/' + ssId
      : '(not created yet — run setup())';
  }
};
