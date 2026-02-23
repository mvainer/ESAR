// ESAR Photos — Share to Website (Chrome Extension)
//
// • On the Albums list page (/albums):  a FAB opens a side panel where you
//   check any number of albums and submit them all at once.
// • On a single album page (/album/…):  a floating one-click button.
//
// SETUP: Replace the placeholder below with your deployed Apps Script web app URL.
// (Apps Script editor → Deploy → Manage deployments → copy the Web App URL)

const WEB_APP_URL = 'https://script.google.com/a/macros/kcesar.org/s/AKfycbwI_BNKfYjyw8v-WYrnpVmetL9pwIv85d0V7qFocSfo7cUosCAxxx9HynKNoWe1DB6Y/exec';

// Automation tabs opened by triggerShareAction() have '#esar-auto' appended to
// their URL by background.js. Detecting this at load time (synchronously, before
// any timers fire) lets us suppress all ESAR UI and show the banner immediately.
var IS_AUTO_TAB = location.hash === '#esar-auto';

// ── SPA navigation watcher ────────────────────────────────────────────────────
// Google Photos is a React SPA; URL changes don't trigger a page reload.

let _lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== _lastUrl) {
    _lastUrl = location.href;
    onNavigate();
  }
}).observe(document.documentElement, { subtree: true, childList: true });

if (IS_AUTO_TAB) {
  // Automation tab: show the banner immediately, skip all ESAR UI injection.
  injectShareBanner();
} else {
  setTimeout(onNavigate, 600); // initial page load
}

function onNavigate() {
  if (IS_AUTO_TAB) return; // automation tab — never inject ESAR UI
  removeById('esar-panel');
  removeById('esar-fab');

  // Always show a "Manage" button on any Google Photos page
  if (!document.getElementById('esar-manage-btn')) injectManageBtn();

  if (isAlbumsListPage()) {
    setTimeout(function() {
      if (!document.getElementById('esar-fab')) injectBulkFab();
    }, 900);
  } else if (isAlbumPage()) {
    setTimeout(function() {
      if (!document.getElementById('esar-fab')) injectSingleFab();
    }, 900);
  }
}

function injectManageBtn() {
  var btn = document.createElement('button');
  btn.id = 'esar-manage-btn';
  btn.textContent = '\uD83D\uDCCB Manage ESAR Albums';
  btn.style.cssText = [
    'position:fixed', 'bottom:28px', 'right:28px', 'z-index:2147483645',
    'background:#e8f0fe', 'color:#1a73e8', 'border:1px solid #c5d4f6',
    'border-radius:20px', 'padding:7px 16px', 'font-size:13px', 'font-weight:500',
    'font-family:Google Sans,Roboto,Arial,sans-serif',
    'cursor:pointer', 'box-shadow:0 2px 6px rgba(0,0,0,.2)',
    'letter-spacing:.2px', 'white-space:nowrap',
  ].join(';');
  btn.addEventListener('mouseenter', function() { this.style.background = '#c5d4f6'; });
  btn.addEventListener('mouseleave', function() { this.style.background = '#e8f0fe'; });
  btn.onclick = function() {
    if (!checkConfig()) return;
    window.open(WEB_APP_URL, '_blank', 'noopener');
  };
  document.body.appendChild(btn);
}

function isAlbumsListPage() {
  return /^\/(u\/\d+\/)?albums?\/?$/.test(location.pathname);
}
function isAlbumPage() {
  return /\/album\/[A-Za-z0-9_-]{15,}/.test(location.pathname);
}

// ── Single-album floating button ──────────────────────────────────────────────

function injectSingleFab() {
  var fab = makeFab('\uD83D\uDCF7\u2002Share to ESAR Website', '#1a73e8');
  fab.id = 'esar-fab';
  fab.onclick = function() {
    if (!checkConfig()) return;
    showShareModal();
  };
  document.body.appendChild(fab);
}

// ── Share-link capture modal ───────────────────────────────────────────────────
// Shows a confirmation card above the FAB with album title and share link fields.
// A MutationObserver auto-fills the share link when the admin opens the Google
// Photos Share dialog (the link appears in an input in the DOM).

var _shareObserver = null;

function showShareModal() {
  removeById('esar-modal');

  var initialShare = findShareUrl();
  var title        = pageTitle();

  var modal = document.createElement('div');
  modal.id = 'esar-modal';
  modal.style.cssText = [
    'position:fixed', 'bottom:132px', 'right:28px', 'z-index:2147483647',
    'background:#fff', 'border-radius:12px', 'overflow:hidden', 'width:340px',
    'box-shadow:0 4px 24px rgba(0,0,0,.25)',
    'font-family:Google Sans,Roboto,Arial,sans-serif', 'font-size:14px', 'color:#202124',
  ].join(';');

  // Header
  var hdr = document.createElement('div');
  hdr.style.cssText = 'background:#1a73e8;color:#fff;padding:13px 16px;display:flex;align-items:center;justify-content:space-between;';

  var hdrTitle = document.createElement('span');
  hdrTitle.textContent = '\uD83D\uDCF7  Add to ESAR Website';
  hdrTitle.style.cssText = 'font-size:15px;font-weight:500;';
  hdr.appendChild(hdrTitle);

  var closeBtn = document.createElement('button');
  closeBtn.textContent = '\u00D7';
  closeBtn.title = 'Close';
  closeBtn.style.cssText = 'background:none;border:none;color:#fff;font-size:20px;cursor:pointer;line-height:1;padding:0 0 0 10px;';
  closeBtn.onclick = function() {
    modal.remove();
    if (_shareObserver) { _shareObserver.disconnect(); _shareObserver = null; }
  };
  hdr.appendChild(closeBtn);
  modal.appendChild(hdr);

  // Body
  var body = document.createElement('div');
  body.style.cssText = 'padding:16px;';

  // -- Title field --
  body.appendChild(makeModalLabel('Album Title'));
  var titleInput = document.createElement('input');
  titleInput.type  = 'text';
  titleInput.value = title;
  titleInput.style.cssText = 'width:100%;border:1px solid #dadce0;border-radius:4px;padding:8px 10px;font-size:14px;box-sizing:border-box;outline:none;margin-bottom:14px;';
  titleInput.addEventListener('focus', function() { this.style.borderColor = '#1a73e8'; });
  titleInput.addEventListener('blur',  function() { this.style.borderColor = '#dadce0'; });
  body.appendChild(titleInput);

  // -- Share link field --
  body.appendChild(makeModalLabel('Member Share Link'));
  var shareInput = document.createElement('input');
  shareInput.type        = 'url';
  shareInput.value       = initialShare;
  shareInput.placeholder = 'photos.app.goo.gl/\u2026';
  shareInput.style.cssText = 'width:100%;border:1px solid #dadce0;border-radius:4px;padding:8px 10px;font-size:14px;box-sizing:border-box;outline:none;margin-bottom:6px;';
  shareInput.addEventListener('focus', function() { this.style.borderColor = '#1a73e8'; });
  shareInput.addEventListener('blur',  function() { this.style.borderColor = '#dadce0'; });
  body.appendChild(shareInput);

  var hint = document.createElement('div');
  hint.style.cssText = 'font-size:12px;margin-bottom:16px;line-height:1.5;';
  if (initialShare) {
    hint.textContent   = '\u2713 Share link detected!';
    hint.style.color   = '#137333';
  } else {
    hint.innerHTML     = '\uD83D\uDCA1 Click <strong>Share \u2192 Create&nbsp;link</strong> in Google Photos \u2014 the link auto-fills here.';
    hint.style.color   = '#80868b';
  }
  body.appendChild(hint);

  // -- Send button --
  var sendBtn = document.createElement('button');
  sendBtn.textContent = 'Send to ESAR Website';
  sendBtn.style.cssText = [
    'width:100%', 'background:#1a73e8', 'color:#fff', 'border:none',
    'border-radius:6px', 'padding:11px', 'font-size:14px', 'font-weight:500',
    'cursor:pointer', 'font-family:Google Sans,Roboto,Arial,sans-serif',
  ].join(';');
  sendBtn.addEventListener('mouseenter', function() { this.style.background = '#1558b0'; });
  sendBtn.addEventListener('mouseleave', function() { this.style.background = '#1a73e8'; });
  sendBtn.onclick = function() {
    var t = titleInput.value.trim();
    var u = shareInput.value.trim() || location.href;
    if (!t) {
      titleInput.style.borderColor = '#ea4335';
      titleInput.focus();
      return;
    }
    modal.remove();
    if (_shareObserver) { _shareObserver.disconnect(); _shareObserver = null; }
    chrome.storage.local.set({ esar_pending_album: { title: t, url: u } }, function() {
      window.open(WEB_APP_URL, '_blank', 'noopener');
    });
  };
  body.appendChild(sendBtn);

  modal.appendChild(body);
  document.body.appendChild(modal);

  if (!initialShare) startShareUrlWatch(shareInput, hint);
}

function makeModalLabel(text) {
  var lbl = document.createElement('div');
  lbl.textContent = text;
  lbl.style.cssText = 'font-size:11px;font-weight:600;color:#5f6368;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;';
  return lbl;
}

// Scan for a photos.app.goo.gl share URL belonging to the current album.
// Priority order:
//   1. Share dialog UI elements (inputs, dialogs, anchors) — most reliable when dialog is open
//   2. Targeted script-tag search near THIS album's own ID — handles already-shared albums
//      without accidentally returning URLs cached from other albums
function findShareUrl() {
  var SHARE_RE = /https:\/\/photos\.app\.goo\.gl\/[A-Za-z0-9]+/;

  // 1. Input / textarea values — the Share dialog puts the link in a copy-field
  var inputs = document.querySelectorAll('input, textarea');
  for (var i = 0; i < inputs.length; i++) {
    var mv = (inputs[i].value || '').match(SHARE_RE);
    if (mv) return mv[0];
  }

  // 2. Open dialog text content
  var dialogs = document.querySelectorAll('[role="dialog"], [aria-modal="true"]');
  for (var i = 0; i < dialogs.length; i++) {
    var mt = (dialogs[i].textContent || '').match(SHARE_RE);
    if (mt) return mt[0];
  }

  // 3. Anchor hrefs visible in the Share dialog
  var anchors = document.querySelectorAll('a[href*="photos.app.goo.gl"]');
  if (anchors.length) {
    var m = String(anchors[0].href).match(SHARE_RE);
    if (m) return m[0];
  }

  // 4. Targeted page-data search: look for the share URL after THIS album's own ID
  //    in the embedded script tags. Google Photos encodes the share URL in the
  //    page's JS payload when the album already has link sharing enabled.
  //    We search ONLY after the album ID (not before) to avoid picking up share URLs
  //    from neighboring albums that appear earlier in the script data.
  var albumId = (location.pathname.match(/\/album\/([A-Za-z0-9_-]{15,})/) || [])[1];
  if (albumId) {
    var scripts = document.scripts;
    for (var s = 0; s < scripts.length; s++) {
      var src = scripts[s].textContent || '';
      var idx = src.indexOf(albumId);
      if (idx === -1) continue;
      // Search 1000 chars AFTER the album ID only — the share URL follows the album
      // ID in Google Photos' JSON payload. Searching before risks returning a URL
      // that belongs to the previous album entry in the data.
      var nearby = src.substring(idx, Math.min(src.length, idx + 1000));
      var ms = nearby.match(SHARE_RE);
      if (ms) return ms[0];
    }
  }

  return '';
}

// Watch for DOM changes (Share dialog opening) to auto-fill the share link.
function startShareUrlWatch(shareInput, hint) {
  if (_shareObserver) _shareObserver.disconnect();
  _shareObserver = new MutationObserver(function() {
    if (shareInput.value && shareInput.value.indexOf('photos.app.goo.gl') !== -1) {
      _shareObserver.disconnect();
      _shareObserver = null;
      return;
    }
    var url = findShareUrl();
    if (url) {
      shareInput.value  = url;
      hint.textContent  = '\u2713 Share link detected!';
      hint.style.color  = '#137333';
      _shareObserver.disconnect();
      _shareObserver = null;
    }
  });
  _shareObserver.observe(document.body, { childList: true, subtree: true });
}

// ── Bulk FAB (albums list page) ───────────────────────────────────────────────

function injectBulkFab() {
  var fab = makeFab('\u2630\u2002Select Albums for ESAR Website', '#1a73e8');
  fab.id = 'esar-fab';
  fab.onclick = function() {
    if (!checkConfig()) return;
    if (document.getElementById('esar-panel')) {
      removeById('esar-panel');
      return;
    }
    openPanel(scrapeAlbums());
  };
  document.body.appendChild(fab);
}

// ── Bulk selection panel ──────────────────────────────────────────────────────

function openPanel(albums) {
  var panel = document.createElement('div');
  panel.id = 'esar-panel';
  panel.style.cssText = [
    'position:fixed', 'top:0', 'right:0', 'bottom:0', 'width:360px',
    'background:#fff', 'z-index:2147483647',
    'display:flex', 'flex-direction:column',
    'box-shadow:-4px 0 24px rgba(0,0,0,.25)',
    'font-family:Google Sans,Roboto,Arial,sans-serif',
    'font-size:14px', 'color:#202124',
  ].join(';');

  // ── Header ──
  var hdr = document.createElement('div');
  hdr.style.cssText = 'background:#1a73e8;color:#fff;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;';

  var hdrTitle = document.createElement('span');
  hdrTitle.textContent = '\uD83D\uDCF7  Add Albums to ESAR Website';
  hdrTitle.style.cssText = 'font-size:15px;font-weight:500;';

  var closeBtn = document.createElement('button');
  closeBtn.textContent = '\u2715';
  closeBtn.style.cssText = 'background:none;border:none;color:#fff;font-size:20px;cursor:pointer;padding:0 4px;line-height:1;';
  closeBtn.onclick = function() { removeById('esar-panel'); };

  hdr.appendChild(hdrTitle);
  hdr.appendChild(closeBtn);
  panel.appendChild(hdr);

  // ── Toolbar ──
  var toolbar = document.createElement('div');
  toolbar.style.cssText = 'padding:10px 14px;border-bottom:1px solid #e8eaed;display:flex;gap:6px;align-items:center;flex-shrink:0;flex-wrap:wrap;';

  var selAllBtn   = makeSmallBtn('Select all');
  var deselAllBtn = makeSmallBtn('Deselect all');
  var refreshBtn  = makeSmallBtn('\u21BA Refresh');

  var countLbl = document.createElement('span');
  countLbl.id = 'esar-count';
  countLbl.style.cssText = 'margin-left:auto;color:#5f6368;font-size:12px;white-space:nowrap;';
  countLbl.textContent = '0 selected';

  [selAllBtn, deselAllBtn, refreshBtn, countLbl].forEach(function(n) {
    toolbar.appendChild(n);
  });
  panel.appendChild(toolbar);

  // ── Scroll hint ──
  var hint = document.createElement('div');
  hint.style.cssText = 'padding:8px 14px;background:#f8f9fa;font-size:12px;color:#80868b;border-bottom:1px solid #e8eaed;flex-shrink:0;';
  hint.textContent = 'Scroll Google Photos to load more albums, then click \u21BA Refresh.';
  panel.appendChild(hint);

  // ── Album list ──
  var list = document.createElement('div');
  list.id = 'esar-list';
  list.style.cssText = 'overflow-y:auto;flex:1;';
  renderList(list, albums);
  panel.appendChild(list);

  // ── Footer ──
  var footer = document.createElement('div');
  footer.style.cssText = 'padding:12px 14px;border-top:1px solid #e8eaed;flex-shrink:0;';

  var addBtn = document.createElement('button');
  addBtn.id = 'esar-add-btn';
  addBtn.textContent = 'Add 0 Albums to Website';
  addBtn.disabled = true;
  addBtn.style.cssText = [
    'width:100%', 'background:#1a73e8', 'color:#fff', 'border:none',
    'border-radius:6px', 'padding:12px', 'font-size:14px', 'font-weight:500',
    'font-family:Google Sans,Roboto,Arial,sans-serif', 'cursor:pointer',
  ].join(';');
  addBtn.addEventListener('mouseenter', function() { if (!this.disabled) this.style.background = '#1558b0'; });
  addBtn.addEventListener('mouseleave', function() { if (!this.disabled) this.style.background = '#1a73e8'; });
  addBtn.onclick = function() { submitSelected(); };

  footer.appendChild(addBtn);
  panel.appendChild(footer);
  document.body.appendChild(panel);

  // Wire up toolbar controls
  selAllBtn.onclick = function() {
    panel.querySelectorAll('input[type=checkbox]').forEach(function(cb) { cb.checked = true; });
    syncCount();
  };
  deselAllBtn.onclick = function() {
    panel.querySelectorAll('input[type=checkbox]').forEach(function(cb) { cb.checked = false; });
    syncCount();
  };
  refreshBtn.onclick = function() {
    renderList(list, scrapeAlbums());
    syncCount();
  };

  syncCount();
}

function renderList(container, albums) {
  container.innerHTML = '';

  if (!albums.length) {
    var empty = document.createElement('div');
    empty.style.cssText = 'padding:32px 16px;text-align:center;color:#80868b;line-height:1.6;';
    empty.innerHTML = '<div style="font-size:32px;margin-bottom:8px;">\uD83D\uDCC1</div>' +
      'No albums found on this page.<br>Scroll down to load more, then click \u21BA Refresh.';
    container.appendChild(empty);
    return;
  }

  albums.forEach(function(album) {
    var row = document.createElement('label');
    row.style.cssText = [
      'display:flex', 'align-items:center', 'gap:10px',
      'padding:10px 14px', 'cursor:pointer', 'border-bottom:1px solid #f1f3f4',
    ].join(';');

    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.dataset.title     = album.title;
    cb.dataset.url       = album.url;
    cb.dataset.thumbnail = album.thumbnail;
    cb.style.cssText = 'width:16px;height:16px;cursor:pointer;flex-shrink:0;accent-color:#1a73e8;';
    cb.addEventListener('change', syncCount);
    row.appendChild(cb);

    // Thumbnail
    var thumb = document.createElement('div');
    thumb.style.cssText = 'width:52px;height:52px;flex-shrink:0;border-radius:4px;overflow:hidden;background:#f1f3f4;display:flex;align-items:center;justify-content:center;';
    if (album.thumbnail) {
      var img = document.createElement('img');
      img.src = album.thumbnail;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
      img.onerror = function() { img.style.display = 'none'; };
      thumb.appendChild(img);
    } else {
      thumb.textContent = '\uD83D\uDCC1';
      thumb.style.fontSize = '22px';
    }
    row.appendChild(thumb);

    // Title
    var titleEl = document.createElement('span');
    titleEl.textContent = album.title;
    titleEl.style.cssText = 'font-size:13px;line-height:1.4;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;';
    row.appendChild(titleEl);

    container.appendChild(row);
  });
}

function syncCount() {
  var checked = document.querySelectorAll('#esar-panel input[type=checkbox]:checked').length;
  var countLbl = document.getElementById('esar-count');
  var addBtn   = document.getElementById('esar-add-btn');
  if (countLbl) countLbl.textContent = checked + ' selected';
  if (addBtn) {
    addBtn.textContent = checked > 0
      ? 'Add ' + checked + ' Album' + (checked === 1 ? '' : 's') + ' to Website'
      : 'Add 0 Albums to Website';
    addBtn.disabled = checked === 0;
    addBtn.style.background = checked > 0 ? '#1a73e8' : '#aecbfa';
    addBtn.style.cursor = checked > 0 ? 'pointer' : 'default';
  }
}

function submitSelected() {
  var checkboxes = Array.prototype.slice.call(
    document.querySelectorAll('#esar-panel input[type=checkbox]:checked')
  );
  if (!checkboxes.length) return;

  var albums = checkboxes.map(function(cb) {
    return { title: cb.dataset.title, url: cb.dataset.url, thumbnail: cb.dataset.thumbnail };
  });
  var total = albums.length;

  // Switch panel to non-blocking progress view — panel stays open and interactive.
  showProgressView(albums);

  // ── Phase 1: Enable sharing and collect share URLs (sequential, focused windows) ──
  // For each album: open window → click Share → auto-click "Create link" if found →
  // if not captured in 0.5 s, a banner in the window prompts the user to click it.
  // Window closes automatically once the URL is captured.
  var done = 0;
  updateProgressNote('A window will open per album — click \u201CCreate link\u201D if prompted.');

  albums.reduce(function(chain, album) {
    return chain.then(function() {
      setAlbumStatus(album.url, 'triggering');
      return new Promise(function(resolve) {
        try {
          chrome.runtime.sendMessage({ type: 'TRIGGER_SHARE', albumUrl: album.url }, function(resp) {
            if (chrome.runtime.lastError) {/* ignore — service worker may have restarted */}
            var shareUrl = (resp && resp.shareUrl) || '';
            album.shareUrl = shareUrl || album.url; // store on album for Phase 2
            var linked = shareUrl.indexOf('photos.app.goo.gl') !== -1;
            setAlbumStatus(album.url, linked ? 'linked' : 'failed');
            done++;
            updateProgressNote('Enabling sharing\u2026 (' + done + '\u2009/\u2009' + total + ')');
            resolve();
          });
        } catch(e) {
          album.shareUrl = album.url;
          setAlbumStatus(album.url, 'failed');
          done++;
          resolve();
        }
      });
    });
  }, Promise.resolve()).then(function() {

    // ── Phase 2: Fetch thumbnails for successfully-shared albums only ─────────
    // Albums that failed to get a photos.app.goo.gl URL are excluded entirely —
    // we must not create spreadsheet rows for them.
    var successAlbums = albums.filter(function(a) {
      return a.shareUrl && a.shareUrl.indexOf('photos.app.goo.gl') !== -1;
    });

    if (!successAlbums.length) {
      updateProgressNote('No albums were shared successfully. No records created.');
      return Promise.resolve(null);
    }

    var thumbsDone = 0;
    updateProgressNote('Preparing thumbnails\u2026 (0\u2009/\u2009' + successAlbums.length + ')');

    return Promise.all(successAlbums.map(function(album) {
      return fetchThumbnailDataUrl(album.thumbnail).then(function(dataUrl) {
        thumbsDone++;
        updateProgressNote('Preparing thumbnails\u2026 (' + thumbsDone + '\u2009/\u2009' + successAlbums.length + ')');
        return {
          title:     album.title,
          url:       album.shareUrl,   // photos.app.goo.gl from Phase 1
          thumbnail: album.thumbnail,  // CDN URL — stored in =IMAGE() formula
          dataUrl:   dataUrl           // data URL — stored in col 6 for gallery
        };
      });
    }));

  }).then(function(result) {
    if (!result) return; // all albums failed — nothing to send
    chrome.storage.local.set({ esar_pending_bulk: result }, function() {
      window.open(WEB_APP_URL, '_blank', 'noopener');
      removeById('esar-panel');
    });
  });
}

// ── Progress view UI ──────────────────────────────────────────────────────────

// Replace the panel body with a per-album progress list. The panel stays visible
// and non-blocking throughout all three phases.
function showProgressView(albums) {
  var panel = document.getElementById('esar-panel');
  if (!panel) return;

  // Remove everything after the header (first child = blue header bar).
  while (panel.children.length > 1) {
    panel.removeChild(panel.lastChild);
  }

  // Status bar
  var statusBar = document.createElement('div');
  statusBar.style.cssText = 'padding:10px 14px;background:#e8f0fe;font-size:13px;font-weight:500;color:#1a73e8;flex-shrink:0;border-bottom:1px solid #c5d4f6;';
  statusBar.textContent = 'Adding ' + albums.length + ' album' + (albums.length === 1 ? '' : 's') + '\u2026';
  panel.appendChild(statusBar);

  // Per-album progress rows
  var list = document.createElement('div');
  list.id = 'esar-progress-list';
  list.style.cssText = 'overflow-y:auto;flex:1;';
  albums.forEach(function(album) {
    var row = document.createElement('div');
    row.dataset.albumUrl = album.url;
    row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid #f1f3f4;';

    var badge = document.createElement('span');
    badge.className = 'esar-status-badge';
    badge.textContent = '\u25CB'; // ○
    badge.style.cssText = 'font-size:15px;flex-shrink:0;width:20px;text-align:center;color:#80868b;';

    var titleEl = document.createElement('span');
    titleEl.textContent = album.title;
    titleEl.style.cssText = 'font-size:13px;line-height:1.4;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;flex:1;';

    row.appendChild(badge);
    row.appendChild(titleEl);
    list.appendChild(row);
  });
  panel.appendChild(list);

  // Note at bottom
  var note = document.createElement('div');
  note.id = 'esar-progress-note';
  note.style.cssText = 'padding:10px 14px;font-size:12px;color:#80868b;border-top:1px solid #e8eaed;flex-shrink:0;';
  note.textContent = 'Starting\u2026';
  panel.appendChild(note);
}

// Update the status badge for a specific album (identified by its URL).
// status: 'triggering' | 'triggered' | 'collecting' | 'linked' | 'failed'
function setAlbumStatus(albumUrl, status) {
  var list = document.getElementById('esar-progress-list');
  if (!list) return;
  var rows = list.querySelectorAll('[data-album-url]');
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].dataset.albumUrl !== albumUrl) continue;
    var badge = rows[i].querySelector('.esar-status-badge');
    if (!badge) return;
    var icons  = { triggering: '\u23F3', triggered: '\u231B', collecting: '\u231B', linked: '\u2713', failed: '\u2717' };
    var colors = { triggering: '#fbbc04', triggered: '#fbbc04', collecting: '#fbbc04', linked: '#137333', failed: '#ea4335' };
    badge.textContent  = icons[status]  || '\u25CB';
    badge.style.color  = colors[status] || '#80868b';
    return;
  }
}

// Update the note line at the bottom of the progress panel.
function updateProgressNote(text) {
  var note = document.getElementById('esar-progress-note');
  if (note) note.textContent = text;
}

// For albums already using a photos.app.goo.gl share link, return it immediately.
// Otherwise, ask the background service worker to open the album in a hidden tab,
// click Share, capture the share link, and close the tab automatically.
function getShareUrlForAlbum(album) {
  if (album.url && album.url.indexOf('photos.app.goo.gl') !== -1) {
    return Promise.resolve(album.url);
  }
  return new Promise(function(resolve) {
    var timeout = setTimeout(function() { resolve(album.url); }, 30000);
    try {
      chrome.runtime.sendMessage({ type: 'GET_SHARE_URL', albumUrl: album.url }, function(resp) {
        clearTimeout(timeout);
        if (chrome.runtime.lastError) { resolve(album.url); return; }
        resolve((resp && resp.shareUrl) || album.url);
      });
    } catch(e) {
      clearTimeout(timeout);
      resolve(album.url);
    }
  });
}

// ── Album scraping ────────────────────────────────────────────────────────────

function scrapeAlbums() {
  var seen   = {};
  var albums = [];

  var links = document.querySelectorAll('a[href*="/album/"]');

  Array.prototype.forEach.call(links, function(link) {
    var href = link.href; // already absolute
    if (!href) return;

    // Only real album links — IDs are long alphanumeric strings
    if (!/\/album\/[A-Za-z0-9_-]{15,}/.test(href)) return;

    // Deduplicate by path (ignore query params / fragments)
    try {
      var path = new URL(href).pathname;
      if (seen[path]) return;
      seen[path] = true;
    } catch(e) { return; }

    var title = getBestTitle(link);
    if (!title || title === 'Google Photos') return;

    // Find thumbnail: try <img> first, then computed background-image.
    // Google Photos sets album cover images via CSS classes (not inline style),
    // so getComputedStyle is required to read the background-image value.
    var img = link.querySelector('img[src*="googleusercontent"]') ||
              link.querySelector('img[src*="lh3.google"]') ||
              link.querySelector('img');
    var thumbnail = '';
    if (img && img.src) {
      thumbnail = img.src;
    } else {
      var els = [link].concat(Array.prototype.slice.call(link.querySelectorAll('*')));
      for (var j = 0; j < els.length && !thumbnail; j++) {
        try {
          var bg = window.getComputedStyle(els[j]).backgroundImage;
          if (bg && bg !== 'none') {
            var bgMatch = bg.match(/url\(["']?([^"')]+)["']?\)/);
            if (bgMatch && (bgMatch[1].indexOf('googleusercontent') !== -1 || bgMatch[1].indexOf('usercontent.google.com') !== -1 || bgMatch[1].indexOf('lh3') !== -1)) {
              thumbnail = bgMatch[1];
            }
          }
        } catch(e) {}
      }
    }

    albums.push({ title: title, url: href, thumbnail: normalizeThumbUrl(thumbnail) });
  });

  return albums;
}

// Fetch a thumbnail URL and return a base64 data URL.
// Delegates to the background service worker, which is NOT subject to CORS and
// can make credentialed fetches to auth-gated Google CDN URLs freely.
// Falls back to '' on any error or after 10 s timeout (gallery shows emoji placeholder).
function fetchThumbnailDataUrl(url) {
  if (!url) return Promise.resolve('');

  var timeout = new Promise(function(resolve) {
    setTimeout(function() { resolve(''); }, 10000);
  });

  var request = new Promise(function(resolve) {
    try {
      chrome.runtime.sendMessage({ type: 'FETCH_THUMBNAIL', url: url }, function(response) {
        if (chrome.runtime.lastError) { resolve(''); return; }
        resolve((response && response.dataUrl) || '');
      });
    } catch(e) { resolve(''); }
  });

  return Promise.race([request, timeout]);
}

// Normalize a Google Photos thumbnail URL so it loads publicly without session auth.
// 1. Convert session-scoped CDN (photos.fife.usercontent.google.com etc.) → lh3.googleusercontent.com
// 2. Strip ?authuser=N query param (session-specific, breaks cross-origin loads)
// 3. Replace size+flag params (e.g. =s247-p-k-no) with =w400 — removes the -k auth flag
function normalizeThumbUrl(url) {
  if (!url) return url;
  url = url.replace(/^https?:\/\/photos\.\w+\.usercontent\.google\.com\//, 'https://lh3.googleusercontent.com/');
  var q = url.indexOf('?');
  if (q !== -1) url = url.substring(0, q);
  url = url.replace(/=[swh]\d[^/]*$/, '=w400');
  return url;
}

function getBestTitle(link) {
  // 1. aria-label on the link element itself
  var label = link.getAttribute('aria-label');
  if (label && label !== 'Google Photos') return label.trim();

  // 2. aria-label on the nearest ancestor that has one
  var el = link.parentElement;
  for (var i = 0; i < 4; i++) {
    if (!el) break;
    label = el.getAttribute('aria-label');
    if (label && label !== 'Google Photos') return label.trim();
    el = el.parentElement;
  }

  // 3. alt attribute on a child <img>
  var img = link.querySelector('img');
  if (img && img.alt && img.alt !== 'Google Photos') return img.alt.trim();

  // 4. visible text content (last resort) — strip item count and menu noise
  var text = link.textContent
    .replace(/\d+\s*items?/gi, '')
    .replace(/More options/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text && text !== 'Google Photos') return text;

  return '';
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function pageTitle() {
  // 1. document.title — Google Photos usually sets this to "Album Name – Google Photos"
  var fromTitle = document.title.replace(/\s*[-\u2013\u2014|]\s*Google Photos\s*$/i, '').trim();
  if (fromTitle && !/^google photos$/i.test(fromTitle)) return fromTitle;

  // 2. Heading elements — Google Photos renders the album name in aria-label or text
  var headings = document.querySelectorAll('[role="heading"], h1, h2');
  for (var i = 0; i < headings.length; i++) {
    var el = headings[i];
    var t = (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim();
    if (t && !/^google photos$/i.test(t) && t.length > 0 && t.length < 300) return t;
  }

  return '';
}

function makeFab(label, bg) {
  var btn = document.createElement('button');
  btn.textContent = label;
  btn.style.cssText = [
    'position:fixed', 'bottom:72px', 'right:28px', 'z-index:2147483646',
    'background:' + bg, 'color:#fff', 'border:none', 'border-radius:24px',
    'padding:13px 22px', 'font-size:14px', 'font-weight:500',
    'font-family:Google Sans,Roboto,Arial,sans-serif',
    'cursor:pointer', 'box-shadow:0 3px 10px rgba(0,0,0,.3)',
    'letter-spacing:.2px', 'white-space:nowrap',
  ].join(';');
  btn.addEventListener('mouseenter', function() { this.style.filter = 'brightness(0.9)'; });
  btn.addEventListener('mouseleave', function() { this.style.filter = ''; });
  return btn;
}

function makeSmallBtn(label) {
  var btn = document.createElement('button');
  btn.textContent = label;
  btn.style.cssText = [
    'background:#f1f3f4', 'color:#202124', 'border:none', 'border-radius:4px',
    'padding:5px 10px', 'font-size:12px', 'cursor:pointer',
    'font-family:Google Sans,Roboto,Arial,sans-serif',
  ].join(';');
  btn.addEventListener('mouseenter', function() { this.style.background = '#e8eaed'; });
  btn.addEventListener('mouseleave', function() { this.style.background = '#f1f3f4'; });
  return btn;
}

function removeById(id) {
  var el = document.getElementById(id);
  if (el) el.remove();
}

function enc(s) { return encodeURIComponent(s); }

function checkConfig() {
  if (WEB_APP_URL === 'YOUR_WEB_APP_URL_HERE' || !WEB_APP_URL) {
    alert('ESAR Extension: please set WEB_APP_URL in chrome-extension/content.js first.');
    return false;
  }
  return true;
}

// ── Background → content message handler ─────────────────────────────────────
// Receives EXTRACT_SHARE_URL from the background service worker when this tab
// was opened programmatically to capture a share link.
// 1. Looks for an existing photos.app.goo.gl URL in the DOM.
// 2. If not found, clicks the Share button to open the Share dialog.
// 3. Watches for the URL to appear (including clicking "Create link" if needed).
// 4. Responds with the URL, or '' on timeout.

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  if (msg.type !== 'EXTRACT_SHARE_URL') return false;

  var existing = findShareUrl();
  if (existing) { sendResponse({ shareUrl: existing }); return true; }

  var responded = false;

  function finish(url) {
    if (responded) return;
    responded = true;
    clearTimeout(urlWatchTimeout);
    domObserver.disconnect();
    sendResponse({ shareUrl: url || '' });
  }

  // Watch the DOM for a photos.app.goo.gl URL to appear after the dialog opens.
  // Also keep trying to click "Create link" in case link sharing isn't enabled yet.
  var domObserver = new MutationObserver(function() {
    var url = findShareUrl();
    if (url) { finish(url); return; }
    clickCreateLinkSilent();
  });
  domObserver.observe(document.body, { childList: true, subtree: true });
  var urlWatchTimeout = setTimeout(function() { finish(''); }, 18000);

  // Poll for the Share button to appear (Google Photos SPA may not have rendered
  // it yet when this message arrives). Try every 500 ms for up to 12 seconds.
  var btnAttempts = 0;
  var btnInterval = setInterval(function() {
    btnAttempts++;
    var btn = findShareButtonEl();
    if (btn) {
      clearInterval(btnInterval);
      btn.click();
      return;
    }
    if (btnAttempts >= 24) { // 24 × 500ms = 12 s
      clearInterval(btnInterval);
      finish('');
    }
  }, 500);

  return true; // Keep the response channel open for async sendResponse
});

// Recursively query selector across shadow DOM boundaries.
function deepQuerySelectorAll(root, selector) {
  var results = Array.prototype.slice.call(root.querySelectorAll(selector));
  var all = root.querySelectorAll('*');
  for (var i = 0; i < all.length; i++) {
    if (all[i].shadowRoot) {
      results = results.concat(deepQuerySelectorAll(all[i].shadowRoot, selector));
    }
  }
  return results;
}

// Find the Share / Share album button element without clicking it.
// Uses shadow DOM traversal because Google Photos may render toolbar buttons inside
// shadow roots that standard querySelectorAll cannot reach.
function findShareButtonEl() {
  var SHARE_RE = /^share(\s+album)?$/i;

  // 1. Quick attribute selectors via shadow-piercing search
  var quickSelectors = [
    '[aria-label="Share album"]', '[aria-label="Share"]',
    '[data-tooltip="Share album"]', '[data-tooltip="Share"]',
    '[title="Share album"]', '[title="Share"]',
  ];
  for (var q = 0; q < quickSelectors.length; q++) {
    var found = deepQuerySelectorAll(document, quickSelectors[q]);
    if (found.length) return found[0];
  }

  // 2. Broad scan across shadow DOM — covers jsaction buttons, text-labeled buttons.
  var candidates = deepQuerySelectorAll(
    document,
    'button, [role="button"], a, [jsaction], [data-tooltip], [aria-label]'
  );
  for (var i = 0; i < candidates.length; i++) {
    var c = candidates[i];

    var label = (c.getAttribute('aria-label')      || '') ||
                (c.getAttribute('data-tooltip')    || '') ||
                (c.getAttribute('title')           || '') ||
                (c.getAttribute('aria-description')|| '');
    if (SHARE_RE.test(label.trim())) return c;

    var jsaction = (c.getAttribute('jsaction') || '').toLowerCase();
    if (jsaction && /share/.test(jsaction) && !/unshare|reshare/.test(jsaction)) return c;

    var text = (c.textContent || '').replace(/\s+/g, ' ').trim();
    if (SHARE_RE.test(text)) return c;
  }
  return null;
}

// If the Share dialog is open but link sharing isn't enabled, click the
// "Create link" / "Get link" / "Turn on link sharing" button.
function clickCreateLinkSilent() {
  var keywords = ['create link', 'get link', 'turn on link sharing', 'get shareable link'];
  var els = document.querySelectorAll('button, [role="button"], [role="menuitem"]');
  for (var i = 0; i < els.length; i++) {
    var text = (els[i].textContent || els[i].getAttribute('aria-label') || '').toLowerCase().trim();
    for (var k = 0; k < keywords.length; k++) {
      if (text === keywords[k] || text.indexOf(keywords[k]) === 0) {
        els[i].click(); return;
      }
    }
  }
}

// ── CLICK_SHARE_ONLY handler ──────────────────────────────────────────────────
// Invoked by background.js when an album tab is opened for bulk sharing.
// Finds the Share button, clicks it, enables link sharing (clicks "Create link"
// ONCE if needed), then waits for the photos.app.goo.gl URL to appear in the DOM.
// Responds with { ok, pageUrl, shareUrl, foundBtn, attempts, createLinkClicked }.
// Key events are relayed to the service worker console via RELAY_LOG so they are
// visible even after the tab closes.
chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  if (msg.type !== 'CLICK_SHARE_ONLY') return false;

  var pageUrl           = location.href;
  var responded         = false;
  var btnClicked        = false;
  var createLinkClicked = false;
  var btnAttempts       = 0;
  var domObserver, urlTimeout, diagInterval, urlPollInterval;
  // createLinkClicked: set true ONLY after a *visible* "Create link" button is clicked.
  // hiddenCreateLinkClicked: set true after the hidden navigation button is clicked once
  // (clicking "Create link" in dialog[0] opens dialog[1], which has the real button).
  var hiddenCreateLinkClicked = false;

  // Send a log line both to the local console and to the service worker so it
  // appears in the extension's persistent console even after the tab closes.
  function relayLog(text) {
    console.log('[ESAR] ' + text);
    try {
      chrome.runtime.sendMessage({ type: 'RELAY_LOG', text: text }, function() {
        if (chrome.runtime.lastError) {} // ignore — tab may be closing
      });
    } catch(e) {}
  }

  relayLog('CLICK_SHARE_ONLY start | visibility=' + document.visibilityState +
           ' | url=' + pageUrl);

  // Fast path: album already has a share URL baked into the page data.
  var existing = findShareUrl();
  if (existing) {
    relayLog('CLICK_SHARE_ONLY: already shared → ' + existing);
    sendResponse({ ok: true, pageUrl: pageUrl, shareUrl: existing,
                   foundBtn: false, alreadyShared: true, attempts: 0,
                   createLinkClicked: false });
    return true;
  }

  // Show the helper banner immediately so the user knows what is happening
  // and what to do if the automated click doesn't fire.
  // Also hide any ESAR UI buttons that would clutter this transient tab.
  injectShareBanner();
  ['esar-manage-btn', 'esar-fab'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  function respond(shareUrl, reason) {
    if (responded) return;
    responded = true;
    if (domObserver)     { domObserver.disconnect();     domObserver     = null; }
    if (urlTimeout)      { clearTimeout(urlTimeout);     urlTimeout      = null; }
    if (diagInterval)    { clearInterval(diagInterval);  diagInterval    = null; }
    if (urlPollInterval) { clearInterval(urlPollInterval); urlPollInterval = null; }
    // Remove the helper banner if the user no longer needs to act.
    var banner = document.getElementById('esar-share-banner');
    if (banner) banner.remove();
    relayLog('CLICK_SHARE_ONLY respond | reason=' + reason +
             ' | shareUrl=' + (shareUrl || '(none)') +
             ' | foundBtn=' + btnClicked + ' | attempts=' + btnAttempts +
             ' | createLinkClicked=' + createLinkClicked);
    sendResponse({ ok: true, pageUrl: pageUrl, shareUrl: shareUrl || '',
                   foundBtn: btnClicked, attempts: btnAttempts,
                   createLinkClicked: createLinkClicked });
  }

  // Diagnostic snapshot every 3 s — relayed to service worker console.
  diagInterval = setInterval(function() {
    var dialogs = document.querySelectorAll('[role="dialog"], [aria-modal="true"]');
    var clBtn   = findCreateLinkBtn();
    relayLog('diag | dialogs=' + dialogs.length +
             ' | btnClicked=' + btnClicked +
             ' | createLinkClicked=' + createLinkClicked +
             ' | createLinkBtn=' + (clBtn ? '"' + clBtn.textContent.trim().substring(0, 40) + '"' : 'null'));
    for (var d = 0; d < dialogs.length; d++) {
      relayLog('dialog[' + d + '] text: ' +
               dialogs[d].textContent.replace(/\s+/g, ' ').trim().substring(0, 300));
      var inputs = dialogs[d].querySelectorAll('input, textarea');
      for (var i = 0; i < inputs.length; i++) {
        relayLog('dialog input[' + i + ']: value="' + (inputs[i].value || '') +
                 '" placeholder="' + (inputs[i].placeholder || '') + '"');
      }
    }
    var url = findShareUrl();
    if (url) relayLog('diag | findShareUrl()=' + url);
  }, 3000);

  // Watch the DOM for the share URL.
  // The Google Photos Share flow is two steps:
  //   1. dialog[0] ("Invite to album") has a nav <div role="button" jsname="VGkEfd">
  //      labelled "Create link" — clicking it opens dialog[1].
  //   2. dialog[1] ("Create link to share") has the real action <button jsname="N9GOnc">
  //      also labelled "Create link" — clicking it calls the sharing API.
  // Both elements are visible once dialog[1] is open, so we MUST use separate
  // search functions: findCreateLinkBtn() for step 1 (global, any tag), and
  // findActionCreateLinkBtn() for step 2 (scoped inside dialog[1] by heading text).
  domObserver = new MutationObserver(function() {
    var url = findShareUrl();
    if (url) { respond(url, 'url-found'); return; }

    if (!btnClicked || createLinkClicked) return;

    if (!hiddenCreateLinkClicked) {
      // Step 1: click the "Create link" nav element in dialog[0] to open dialog[1].
      var navEl = findCreateLinkBtn();
      if (!navEl) return;
      hiddenCreateLinkClicked = true;
      relayLog('STEP1 nav click jsname=' + (navEl.getAttribute('jsname') || navEl.tagName));
      navEl.click();
    } else {
      // Step 2: click the real "Create link" action button inside dialog[1].
      // Uses findActionCreateLinkBtn() which scopes the search to the dialog
      // whose heading is "Create link to share" — avoids re-clicking the nav DIV.
      var actionBtn = findActionCreateLinkBtn();
      if (!actionBtn) return;
      createLinkClicked = true;
      var rect = actionBtn.getBoundingClientRect();
      var cx = Math.round(rect.left + rect.width  / 2);
      var cy = Math.round(rect.top  + rect.height / 2);
      relayLog('STEP2 action click jsname=' + (actionBtn.getAttribute('jsname') || '?') +
               ' rect={w:' + Math.round(rect.width) + ',h:' + Math.round(rect.height) + '}');
      // Dispatch full pointer+mouse event sequence so JsAction handlers fire.
      ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(function(type) {
        var isPointer = type === 'pointerdown' || type === 'pointerup';
        actionBtn.dispatchEvent(new (isPointer ? PointerEvent : MouseEvent)(type, {
          bubbles: true, cancelable: true, view: window,
          clientX: cx, clientY: cy, screenX: cx, screenY: cy,
          buttons: (type === 'pointerup' || type === 'mouseup') ? 0 : 1,
          button: 0, pointerId: 1, isPrimary: true,
        }));
      });
      setTimeout(function() {
        relayLog('STEP2_POST200ms shareUrl=' + (findShareUrl() || '(none)') +
                 ' dialogs=' + document.querySelectorAll('[role="dialog"],[aria-modal="true"]').length);
      }, 200);
    }
  });
  domObserver.observe(document.body, { childList: true, subtree: true });

  // 18 s hard deadline — respond with '' so the background tab gets closed.
  urlTimeout = setTimeout(function() { respond('', '18s-timeout'); }, 18000);

  // Poll every 300 ms as a fallback for when MutationObserver is throttled.
  // This ensures the URL is captured even if the user switches window focus
  // between when we focus the background window and when the API call returns.
  urlPollInterval = setInterval(function() {
    var url = findShareUrl();
    if (url) respond(url, 'url-poll');
  }, 300);

  // Poll for the Share button (SPA renders asynchronously after page load).
  var btnInterval = setInterval(function() {
    btnAttempts++;
    var btn = findShareButtonEl();
    if (btn) {
      clearInterval(btnInterval);
      btnClicked = true;
      relayLog('CLICK_SHARE_ONLY: Share btn found on attempt ' + btnAttempts +
               ' | label="' + (btn.getAttribute('aria-label') || btn.textContent.trim().substring(0, 30)) + '"');
      btn.click();
      return;
    }
    if (btnAttempts >= 20) { // 20 × 500 ms = 10 s
      clearInterval(btnInterval);
      respond('', 'share-btn-not-found');
    }
  }, 500);

  return true;
});

// Inject a prominent banner into the album tab telling the user to click
// "Create link" themselves. Shown when the automated click has no effect.
// The banner is removed automatically when respond() closes the handler.
function injectShareBanner() {
  if (document.getElementById('esar-share-banner')) return; // already shown
  var banner = document.createElement('div');
  banner.id = 'esar-share-banner';
  banner.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:2147483647',
    'background:#1a73e8', 'color:#fff', 'text-align:center',
    'padding:14px 20px', 'font-size:15px', 'font-weight:500',
    'font-family:Google Sans,Roboto,Arial,sans-serif',
    'box-shadow:0 2px 8px rgba(0,0,0,.3)', 'letter-spacing:.1px',
  ].join(';');
  banner.textContent = '\uD83D\uDD17  ESAR: Opening share dialog\u2026 click \u201CCreate link\u201D if prompted \u2014 this window closes automatically.';
  document.body.appendChild(banner);
}

// Find the nav "Create link" element in dialog[0] — used for step 1.
// Accepts any tag (the nav element is a <div role="button">). Prefers visible
// elements, falls back to any match so it also fires if the element is hidden.
function findCreateLinkBtn() {
  var keywords = ['create link', 'get link', 'turn on link sharing', 'get shareable link'];
  var els = document.querySelectorAll('button, [role="button"], [role="menuitem"]');
  var firstMatch = null;
  for (var i = 0; i < els.length; i++) {
    var text = (els[i].textContent || els[i].getAttribute('aria-label') || '').toLowerCase().trim();
    for (var k = 0; k < keywords.length; k++) {
      if (text === keywords[k] || text.indexOf(keywords[k]) === 0) {
        var r = els[i].getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return els[i]; // visible → return immediately
        if (!firstMatch) firstMatch = els[i];             // hidden → remember as fallback
        break;
      }
    }
  }
  return firstMatch;
}

// Find the real "Create link" action <button> inside dialog[1].
// Identifies dialog[1] by its heading text ("Create link to share") so it is
// never confused with the nav DIV in dialog[0] which shares the same label.
// Returns the visible button, or null if dialog[1] is not yet open.
function findActionCreateLinkBtn() {
  var dialogs = document.querySelectorAll('[role="dialog"], [aria-modal="true"]');
  for (var d = 0; d < dialogs.length; d++) {
    // Identify the "Create link to share" dialog by its h1 heading.
    var heading = dialogs[d].querySelector('h1');
    if (!heading) continue;
    if (heading.textContent.trim().toLowerCase() !== 'create link to share') continue;
    // Scoped to this dialog — find the action button by label.
    var buttons = dialogs[d].querySelectorAll('button');
    for (var b = 0; b < buttons.length; b++) {
      var label = (buttons[b].textContent || buttons[b].getAttribute('aria-label') || '').trim().toLowerCase();
      if (label !== 'create link' && label.indexOf('create link') !== 0) continue;
      var r = buttons[b].getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return buttons[b];
    }
  }
  return null;
}

