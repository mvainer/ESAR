// ESAR Photos — Share to Website (Chrome Extension)
//
// • On the Albums list page (/albums):  a FAB opens a side panel where you
//   check any number of albums and submit them all at once.
// • On a single album page (/album/…):  a floating one-click button.
//
// SETUP: Replace the placeholder below with your deployed Apps Script web app URL.
// (Apps Script editor → Deploy → Manage deployments → copy the Web App URL)

const WEB_APP_URL = 'https://script.google.com/a/macros/kcesar.org/s/AKfycbzf2j2xVEiBFcEuQ3k7VDGNgBTuRUSrO27inCanaqr3nfAGO8_RbUUtWLdbCy73-EU/exec';

// ── SPA navigation watcher ────────────────────────────────────────────────────
// Google Photos is a React SPA; URL changes don't trigger a page reload.

let _lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== _lastUrl) {
    _lastUrl = location.href;
    onNavigate();
  }
}).observe(document.documentElement, { subtree: true, childList: true });

setTimeout(onNavigate, 600); // initial page load

function onNavigate() {
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

// Scan DOM for a photos.app.goo.gl share URL (appears inside the Share dialog).
function findShareUrl() {
  var SHARE_RE = /https:\/\/photos\.app\.goo\.gl\/[A-Za-z0-9]+/;

  // 1. Anchor hrefs
  var anchors = document.querySelectorAll('a[href*="photos.app.goo.gl"]');
  if (anchors.length) {
    var m = String(anchors[0].href).match(SHARE_RE);
    if (m) return m[0];
  }

  // 2. Input / textarea values (Share dialog puts the link in a copy-field)
  var inputs = document.querySelectorAll('input, textarea');
  for (var i = 0; i < inputs.length; i++) {
    var mv = (inputs[i].value || '').match(SHARE_RE);
    if (mv) return mv[0];
  }

  // 3. Open dialog text content
  var dialogs = document.querySelectorAll('[role="dialog"], [aria-modal="true"]');
  for (var i = 0; i < dialogs.length; i++) {
    var mt = (dialogs[i].textContent || '').match(SHARE_RE);
    if (mt) return mt[0];
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

  var selected = checkboxes.map(function(cb) {
    return { title: cb.dataset.title, url: cb.dataset.url, thumbnail: cb.dataset.thumbnail };
  });

  // Store in chrome.storage — URL hash is stripped by Google auth redirects.
  chrome.storage.local.set({ esar_pending_bulk: selected }, function() {
    window.open(WEB_APP_URL, '_blank', 'noopener');
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

    albums.push({ title: title, url: href, thumbnail: thumbnail });
  });

  return albums;
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
