// Config.gs — User-editable settings for ESARPhotos
// Edit SHEET_NAME before running setup() if you want a different spreadsheet name.

var CONFIG = {
  // Name of the Google Spreadsheet created as the album directory + activity log.
  // It will contain two tabs:
  //   "Sync Log"        — activity log (albums added/removed via web app)
  //   "Album Directory" — live table of all albums (embed this tab in Google Sites)
  SHEET_NAME: 'ESARPhotos Album Directory',
};
