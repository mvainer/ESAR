// ESAR Photos — Share to Website (Chrome Extension)
//
// • On the Albums list page (/albums):  a FAB opens a side panel where you
//   check any number of albums and submit them all at once.
// • On a single album page (/album/…):  a floating one-click button.
//
// SETUP: Replace the placeholder below with your deployed Apps Script web app URL.
// (Apps Script editor → Deploy → Manage deployments → copy the Web App URL)

const WEB_APP_URL = 'https://script.google.com/a/macros/kcesar.org/s/AKfycbx-N_1mFodZifFFypMSYhFzt7rv-qgeVj6FFaAfm3QHKseQhu2A7Yhcr8NvoTI1RPDY/exec';

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
    var data = { title: pageTitle(), url: location.href };
    window.open(
      WEB_APP_URL + '#single=' + enc(JSON.stringify(data)),
      '_blank', 'noopener'
    );
  };
  document.body.appendChild(fab);
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

  // Pass albums via URL fragment (avoids GET param length limits)
  var hash = '#bulk=' + enc(JSON.stringify(selected));
  window.open(WEB_APP_URL + hash, '_blank', 'noopener');
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

    // Find thumbnail: prefer images in the link that look like photo URLs
    var img = link.querySelector('img[src*="googleusercontent"]') ||
              link.querySelector('img[src*="lh3.google"]') ||
              link.querySelector('img');
    var thumbnail = img ? img.src : '';

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

  // 4. visible text content (last resort)
  var text = link.textContent.trim();
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
    'position:fixed', 'bottom:28px', 'right:28px', 'z-index:2147483646',
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
