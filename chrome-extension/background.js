// background.js — Extension service worker
//
// Handles message types from content scripts:
//
//  FETCH_THUMBNAIL — fetches a Google CDN image (auth-gated) and returns a
//                    base64 data URL, resized to ≤300 px / JPEG 0.82.
//                    Background workers bypass CORS; content scripts cannot.
//
//  GET_SHARE_URL   — opens the album URL in a foreground tab (active, so the
//                    Google Photos SPA renders fully), tells the content script
//                    to locate and click Share and capture the share link, then
//                    closes the tab. Used for the single-album modal.
//
//  TRIGGER_SHARE   — opens the album in an unfocused window, waits 5 s for
//                    the SPA, focuses the window (so React renders the Share
//                    dialog properly), sends CLICK_SHARE_ONLY, waits for the
//                    photos.app.goo.gl URL to appear, closes the window.
//                    Returns { shareUrl } so no second collection pass is needed.
//
//  RELAY_LOG       — content scripts send diagnostic log lines via this message
//                    so they appear in the service worker console even when the
//                    background tab is already closed.

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

  // ── RELAY_LOG ─────────────────────────────────────────────────────────────────
  // Content scripts in short-lived background tabs use this to surface their
  // console.log output in the persistent service worker console.
  if (message.type === 'RELAY_LOG') {
    console.log('[ESAR][tab ' + (sender.tab ? sender.tab.id : '?') + '] ' + message.text);
    return false;
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
    console.log('[ESAR] TRIGGER_SHARE →', message.albumUrl);
    triggerShareAction(message.albumUrl).then(function(result) {
      console.log('[ESAR] TRIGGER_SHARE done, shareUrl:', result.shareUrl || '(none)');
      sendResponse({ ok: true, shareUrl: result.shareUrl });
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

// Opens the album in a new unfocused window so the SPA initialises without
// stealing the user's focus. Once the page has loaded and the SPA has had 5 s
// to render, the window is briefly focused (chrome.windows.update) so that
// Google Photos' React scheduler runs at full speed and updates the Share dialog
// DOM with the photos.app.goo.gl URL after "Create link" is clicked. The window
// is closed immediately after the URL is captured (or on timeout).
function triggerShareAction(albumUrl) {
  return new Promise(function(resolve) {
    var tabId = null;
    var winId = null;

    // 40 s covers 5 s SPA wait + 10 s Share-button poll + 18 s URL watch + slack.
    var globalTimeout = setTimeout(function() {
      if (tabId != null) chrome.tabs.remove(tabId, function() {});
      resolve({ shareUrl: '' });
    }, 40000);

    chrome.windows.create({ url: albumUrl, focused: false }, function(win) {
      if (!win || !win.tabs || !win.tabs.length) {
        console.log('[ESAR] triggerShareAction: window create failed for', albumUrl);
        clearTimeout(globalTimeout); resolve({ shareUrl: '' }); return;
      }
      winId  = win.id;
      tabId  = win.tabs[0].id;
      console.log('[ESAR] triggerShareAction: window', winId, 'tab', tabId, 'created for', albumUrl);

      function onTabUpdated(id, changeInfo, updatedTab) {
        if (id !== tabId || changeInfo.status !== 'complete') return;
        if (!updatedTab.url || updatedTab.url.indexOf('photos.google.com') === -1) {
          console.log('[ESAR] triggerShareAction: tab loaded unexpected URL:', updatedTab.url);
          return;
        }
        chrome.tabs.onUpdated.removeListener(onTabUpdated);
        console.log('[ESAR] triggerShareAction: tab', tabId, 'loaded', updatedTab.url, '— waiting 5 s for SPA');

        // After the SPA settles, focus the window so React runs at full speed
        // (unfocused / visibility:hidden tabs throttle animation frames and may
        // prevent the Share dialog from updating with the share URL).
        setTimeout(function() {
          console.log('[ESAR] triggerShareAction: focusing window', winId, 'then sending CLICK_SHARE_ONLY');
          chrome.windows.update(winId, { focused: true }, function() {
            chrome.tabs.sendMessage(tabId, { type: 'CLICK_SHARE_ONLY' }, function(resp) {
              if (chrome.runtime.lastError) {
                console.log('[ESAR] triggerShareAction: CLICK_SHARE_ONLY error:', chrome.runtime.lastError.message);
              } else {
                console.log('[ESAR] triggerShareAction: CLICK_SHARE_ONLY response:', JSON.stringify(resp));
              }
              clearTimeout(globalTimeout);
              chrome.tabs.remove(tabId, function() {});
              resolve({ shareUrl: (resp && resp.shareUrl) || '' });
            });
          });
        }, 5000);
      }

      chrome.tabs.onUpdated.addListener(onTabUpdated);
    });
  });
}

