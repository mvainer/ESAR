// background.js — Extension service worker
//
// Handles two message types from content.js:
//
//  FETCH_THUMBNAIL  — fetches a Google CDN image (auth-gated) and returns a
//                     base64 data URL, resized to ≤300 px / JPEG 0.82.
//                     Background workers bypass CORS; content scripts cannot.
//
//  GET_SHARE_URL    — opens the album URL in a foreground tab (active, so the
//                     Google Photos SPA renders fully), tells the content script
//                     to locate and click Share and capture the share link, then
//                     closes the tab. Falls back to the original URL on error.

var THUMB_MAX_PX  = 300;
var THUMB_QUALITY = 0.82;

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {

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

  if (message.type === 'GET_SHARE_URL') {
    getShareUrl(message.albumUrl).then(function(shareUrl) {
      sendResponse({ shareUrl: shareUrl });
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

    // Open as a normal active tab — ensures the Google Photos SPA renders fully.
    // submitSelected() calls this sequentially, so only one extra tab is open at a time.
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
