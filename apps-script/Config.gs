// Config.gs — All user-editable settings for ESARPhotos Sync
// Edit this file before running setup().

var CONFIG = {
  // ── Sync Schedule ─────────────────────────────────────────────────────────
  // How often to check for new Google Photos albums (in hours).
  // Minimum: 1. Changing this requires re-running setup().
  SYNC_INTERVAL_HOURS: 1,

  // Internal name for the time-based trigger. Do not change after first setup().
  TRIGGER_FUNCTION: 'syncPhotos',

  // ── Dashboard ─────────────────────────────────────────────────────────────
  // Name of the Google Spreadsheet created as the sync log + album directory.
  // It will contain two tabs:
  //   "Sync Log"        — timestamped log of every sync run
  //   "Album Directory" — live table of all albums (embed this tab in Google Sites)
  SHEET_NAME: 'ESARPhotos Sync Log',
};
