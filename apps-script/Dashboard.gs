// Dashboard.gs — Google Sheet sync status log

var Dashboard = {

  _sheet: null,

  // ── Sheet Access ───────────────────────────────────────────────────────────

  /**
   * Return the active dashboard sheet, creating it if necessary.
   */
  getSheet: function() {
    if (Dashboard._sheet) return Dashboard._sheet;

    var props = PropertiesService.getScriptProperties();
    var id    = props.getProperty('dashboardSheetId');

    if (id) {
      try {
        var ss = SpreadsheetApp.openById(id);
        Dashboard._sheet = ss.getSheetByName('Sync Log') || ss.getActiveSheet();
        return Dashboard._sheet;
      } catch (e) {
        // Sheet was deleted from Drive — recreate it
        Logger.log('Dashboard sheet not found, recreating: ' + e.message);
      }
    }

    return Dashboard.init();
  },

  /**
   * Create a new dashboard spreadsheet with headers.
   * Called by setup() and automatically when the sheet is missing.
   */
  init: function() {
    var ss    = SpreadsheetApp.create(CONFIG.SHEET_NAME);
    var sheet = ss.getActiveSheet();
    sheet.setName('Sync Log');

    // Header row
    var headers = ['Timestamp', 'Status', 'Album Title', 'Google Photos Link', 'Sites Page URL', 'Notes'];
    sheet.appendRow(headers);

    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#1a73e8');
    headerRange.setFontColor('#ffffff');

    // Column widths for readability
    sheet.setColumnWidth(1, 160);  // Timestamp
    sheet.setColumnWidth(2,  80);  // Status
    sheet.setColumnWidth(3, 200);  // Album Title
    sheet.setColumnWidth(4, 280);  // Google Photos Link
    sheet.setColumnWidth(5, 280);  // Sites Page URL
    sheet.setColumnWidth(6, 220);  // Notes

    sheet.setFrozenRows(1);

    PropertiesService.getScriptProperties().setProperty('dashboardSheetId', ss.getId());
    Dashboard._sheet = sheet;

    Logger.log('Dashboard sheet created: ' + ss.getUrl());
    return sheet;
  },

  /**
   * Return the URL of the dashboard spreadsheet, or a placeholder if not created yet.
   */
  getUrl: function() {
    var props = PropertiesService.getScriptProperties();
    var id    = props.getProperty('dashboardSheetId');
    return id
      ? 'https://docs.google.com/spreadsheets/d/' + id
      : '(not created yet — run setup())';
  },

  // ── Logging ────────────────────────────────────────────────────────────────

  /**
   * Append a row to the dashboard sheet.
   *
   * @param {string} status     One of: INFO | CREATED | ERROR
   * @param {string} albumTitle Album name (empty for INFO/ERROR rows)
   * @param {string} albumUrl   Google Photos album URL (read-only link for members)
   * @param {string} pageUrl    Google Sites page URL (empty until created)
   * @param {string} notes      Free-text notes or error message
   */
  log: function(status, albumTitle, albumUrl, pageUrl, notes) {
    try {
      var sheet = Dashboard.getSheet();

      // Color-code rows by status
      var row = sheet.appendRow([
        new Date().toLocaleString(),
        status,
        albumTitle || '',
        albumUrl   || '',
        pageUrl    || '',
        notes      || ''
      ]);

      var lastRow   = sheet.getLastRow();
      var rowRange  = sheet.getRange(lastRow, 1, 1, 6);

      if (status === 'CREATED') {
        rowRange.setBackground('#e6f4ea');  // light green
      } else if (status === 'ERROR') {
        rowRange.setBackground('#fce8e6');  // light red
      }

    } catch (e) {
      // Never let a dashboard write failure break the main sync
      Logger.log('[Dashboard] Write failed: ' + e.message);
    }
  }
};
