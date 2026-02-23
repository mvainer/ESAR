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
    }

    SitesCreator._ensureHeader(tab);
    return tab;
  },

  /**
   * Guarantee row 1 is the header row, regardless of how the sheet got into its current state.
   *
   * Cases handled:
   *   A) Tab is empty          → write header at row 1
   *   B) Row 1 IS the header   → no-op (fast path: single cell read)
   *   C) Row 1 has album data  → insert a blank row 1, then write the header
   *      (happens when someone deleted the header row but left album rows intact)
   */
  _ensureHeader: function(tab) {
    var lastRow = tab.getLastRow();

    if (lastRow === 0) {
      SitesCreator._writeHeader(tab);
      return;
    }

    if (String(tab.getRange(1, 2).getValue()) === 'Album') return;

    // Album data is squatting in row 1 — push everything down by one row
    tab.insertRowBefore(1);
    SitesCreator._writeHeader(tab);
  },

  _writeHeader: function(tab) {
    tab.getRange(1, 1, 1, 5)
       .setValues([['', 'Album', 'Date Added', 'Photos', 'View Album (read-only link)']]);

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
   * @param {string} title
   * @param {string} photosUrl     Share link for members (photos.app.goo.gl/…)
   * @param {string} thumbnailUrl  CDN URL stored in =IMAGE() formula (col 1) for Sheets display
   * @param {string} [webThumbnail]  data URL stored in col 6 for web app/gallery display
   */
  addAlbumDirect: function(title, photosUrl, thumbnailUrl, webThumbnail) {
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

    // Col 6: data URL for web app display (avoids cross-origin auth issues with CDN URLs)
    if (webThumbnail) {
      tab.getRange(newRow, 6).setValue(webThumbnail);
    }

    if (newRow % 2 === 0) {
      tab.getRange(newRow, 1, 1, 6).setBackground('#f8f9fa');
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

    var values       = tab.getRange(2, 1, lastRow - 1, 6).getValues();  // cols 1–6
    var linkFormulas = tab.getRange(2, 5, lastRow - 1, 1).getFormulas();

    var albums = [];
    for (var i = 0; i < values.length; i++) {
      var title = values[i][1];
      if (!title) continue;  // skip blank rows

      // Extract Photos URL from =HYPERLINK("url","label") formula in col 5
      var linkFormula = linkFormulas[i][0];
      var urlMatch    = linkFormula.match(/=HYPERLINK\("([^"]+)"/);
      var photosUrl   = urlMatch ? urlMatch[1] : String(values[i][4] || '');

      // Col 6 (index 5): data URL stored by the Chrome extension — no cross-origin auth needed.
      // Falls back to empty string (gallery/admin show emoji placeholder for older albums).
      var thumbnail = String(values[i][5] || '');

      albums.push({
        row:       i + 2,
        title:     String(title),
        dateAdded: (function(v) {
          if (!v) return '';
          if (v instanceof Date) return v.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
          return String(v);
        })(values[i][2]),
        photosUrl: photosUrl,
        thumbnail: thumbnail
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
