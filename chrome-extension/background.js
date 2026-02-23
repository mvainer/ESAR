// background.js — Extension service worker
//
// Handles message types from content scripts:
//
//  FETCH_THUMBNAIL           — fetches a Google CDN image (auth-gated) and returns a
//                              base64 data URL, resized to ≤300 px / JPEG 0.82.
//                              Background workers bypass CORS; content scripts cannot.
//
//  GET_SHARE_URL             — opens the album URL in a foreground tab (active, so the
//                              Google Photos SPA renders fully), tells the content script
//                              to locate and click Share and capture the share link, then
//                              closes the tab. Used for the single-album modal.
//
//  TRIGGER_SHARE             — opens the album in a background tab (active: false), sends
//                              CLICK_SHARE_ONLY to initiate link sharing, waits 3 s for
//                              the server to register the share, then closes the tab.
//                              Fire-and-forget — does NOT wait for or return the share URL.
//
//  COLLECT_FROM_SHARING_PAGE — opens photos.google.com/sharing in a background tab, sends
//                              WATCH_SHARING_PAGE_CONTENT with the album list, waits for
//                              the content script to scan and match share URLs, closes the
//                              tab. Returns { albumId: shareUrl } for matched albums.

var THUMB_MAX_PX  = 300;
var THUMB_QUALITY = 0.82;

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {

  // ── FETCH_THUMBNAIL ──────────────────────────────────────────────────────────
  if (message.type === 'FETCH_THUMBNAIL') {
    var url = message.url;
    if (!url) { sendResponse({ dataUrl: '' }); return false; }

    url = url.replace(/=[swh]\d+[^/]*$/, '=w200');

    fetch(url, { credentials: 'include' })
      .then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.blob();
      })
      .then(function(blob) { return createImageBitmap(blob); })
      .then(function(bitmap) {
        var w = bitmap.width  || THUMB_MAX_PX;
        var h = bitmap.height || THUMB_MAX_PX;
        var scale = Math.min(THUMB_MAX_PX / w, THUMB_MAX_PX / h, 1);
        var cw = Math.max(1, Math.round(w * scale));
        var ch = Math.max(1, Math.round(h * scale));
        var canvas = new OffscreenCanvas(cw, ch);
        canvas.getContext('2d').drawImage(bitmap, 0, 0, cw, ch);
        bitmap.close();
        return canvas.convertToBlob({ type: 'image/jpeg', quality: THUMB_QUALITY });
      })
      .then(function(jpegBlob) { return jpegBlob.arrayBuffer(); })
      .then(function(buf) {
        var bytes  = new Uint8Array(buf);
        var binary = '';
        var CHUNK  = 8192;
        for (var i = 0; i < bytes.length; i += CHUNK) {
          binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + CHUNK, bytes.length)));
        }
        sendResponse({ dataUrl: 'data:image/jpeg;base64,' + btoa(binary) });
      })
      .catch(function(e) { sendResponse({ dataUrl: '', error: e.message }); });

    return true;
  }

  // ── GET_SHARE_URL ────────────────────────────────────────────────────────────
  if (message.type === 'GET_SHARE_URL') {
    getShareUrl(message.albumUrl).then(function(shareUrl) {
      sendResponse({ shareUrl: shareUrl });
    });
    return true;
  }

  // ── TRIGGER_SHARE ────────────────────────────────────────────────────────────
  if (message.type === 'TRIGGER_SHARE') {
    triggerShareAction(message.albumUrl).then(function() {
      sendResponse({ ok: true });
    });
    return true;
  }

  // ── COLLECT_FROM_SHARING_PAGE ────────────────────────────────────────────────
  if (message.type === 'COLLECT_FROM_SHARING_PAGE') {
    collectSharingPageUrls(message.albums).then(function(results) {
      sendResponse({ results: results });
    });
    return true;
  }

  return false;
});

// Opens albumUrl in a new active tab (active = full Google Photos SPA rendering),
// sends EXTRACT_SHARE_URL to the content script there, and closes the tab when done.
// The caller (submitSelected) processes albums sequentially so only one tab opens
// at a time and Chrome automatically refocuses the previous tab when it closes.
function getShareUrl(albumUrl) {
  return new Promise(function(resolve) {
    var tabId = null;

    var globalTimeout = setTimeout(function() {
      if (tabId != null) chrome.tabs.remove(tabId, function() {});
      resolve('');
    }, 30000);

    chrome.tabs.create({ url: albumUrl }, function(tab) {
      tabId = tab.id;

      function onTabUpdated(id, changeInfo, updatedTab) {
        if (id !== tabId || changeInfo.status !== 'complete') return;
        if (!updatedTab.url || updatedTab.url.indexOf('photos.google.com') === -1) return;

        chrome.tabs.onUpdated.removeListener(onTabUpdated);

        // Give the SPA time to render interactive elements after the HTML loads.
        setTimeout(function() {
          chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_SHARE_URL' }, function(response) {
            clearTimeout(globalTimeout);
            chrome.tabs.remove(tabId, function() {});
            if (chrome.runtime.lastError) { resolve(''); return; }
            resolve((response && response.shareUrl) || '');
          });
        }, 5000);
      }

      chrome.tabs.onUpdated.addListener(onTabUpdated);
    });
  });
}

// Opens the album in a new unfocused window, clicks Share → Create link to initiate
// link sharing on Google Photos' servers, waits 3 s for the share to register, then
// closes the tab (and window). Does NOT wait for or return the share URL.
//
// chrome.windows.create({ focused: false }) is used instead of
// chrome.tabs.create({ active: false }) because background tabs in the current window
// may not fully render React SPAs (no rendering resources allocated). A new window
// with focused:false keeps the user's current window active while still giving the
// new tab a full rendering context so Google Photos initialises its toolbar buttons.
function triggerShareAction(albumUrl) {
  return new Promise(function(resolve) {
    var tabId = null;

    var globalTimeout = setTimeout(function() {
      if (tabId != null) chrome.tabs.remove(tabId, function() {});
      resolve();
    }, 25000);

    chrome.windows.create({ url: albumUrl, focused: false }, function(win) {
      if (!win || !win.tabs || !win.tabs.length) { clearTimeout(globalTimeout); resolve(); return; }
      tabId = win.tabs[0].id;

      function onTabUpdated(id, changeInfo, updatedTab) {
        if (id !== tabId || changeInfo.status !== 'complete') return;
        if (!updatedTab.url || updatedTab.url.indexOf('photos.google.com') === -1) return;
        chrome.tabs.onUpdated.removeListener(onTabUpdated);

        // Give the SPA time to render interactive elements.
        setTimeout(function() {
          chrome.tabs.sendMessage(tabId, { type: 'CLICK_SHARE_ONLY' }, function() {
            // Wait for the share to register server-side before closing the tab.
            setTimeout(function() {
              clearTimeout(globalTimeout);
              chrome.tabs.remove(tabId, function() {});
              resolve();
            }, 3000);
          });
        }, 5000);
      }

      chrome.tabs.onUpdated.addListener(onTabUpdated);
    });
  });
}

// Opens photos.google.com/sharing in a background tab and asks the content script
// to scan the page for share URLs matching the given albums (by album ID extracted
// from each album's URL). Returns { albumId: shareUrl } for albums it found.
function collectSharingPageUrls(albums) {
  return new Promise(function(resolve) {
    var tabId = null;

    var globalTimeout = setTimeout(function() {
      if (tabId != null) chrome.tabs.remove(tabId, function() {});
      resolve({});
    }, 90000);

    chrome.tabs.create({ url: 'https://photos.google.com/u/0/sharing', active: false }, function(tab) {
      tabId = tab.id;

      function onTabUpdated(id, changeInfo, updatedTab) {
        if (id !== tabId || changeInfo.status !== 'complete') return;
        if (!updatedTab.url || updatedTab.url.indexOf('photos.google.com') === -1) return;
        chrome.tabs.onUpdated.removeListener(onTabUpdated);

        // Give the SPA time to render and populate script data.
        setTimeout(function() {
          chrome.tabs.sendMessage(tabId, {
            type: 'WATCH_SHARING_PAGE_CONTENT',
            albums: albums
          }, function(response) {
            clearTimeout(globalTimeout);
            chrome.tabs.remove(tabId, function() {});
            if (chrome.runtime.lastError) { resolve({}); return; }
            resolve((response && response.results) || {});
          });
        }, 4000);
      }

      chrome.tabs.onUpdated.addListener(onTabUpdated);
    });
  });
}
