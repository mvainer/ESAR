// relay.js — runs on the Apps Script web app page (script.google.com)
// Reads pending album data written by content.js and forwards it to the
// page via postMessage so webapp.html can pre-fill the form.
// Uses chrome.storage because Google auth redirects strip URL hash/params.

console.log('[ESAR relay.js] loaded on', window.location.href);

setTimeout(function() {
  chrome.storage.local.get(['esar_pending_album', 'esar_pending_bulk'], function(result) {
    console.log('[ESAR relay.js] storage read:', JSON.stringify(result));

    if (result.esar_pending_bulk) {
      window.postMessage({ type: 'ESAR_BULK', albums: result.esar_pending_bulk }, '*');
      console.log('[ESAR relay.js] posted bulk message');
      chrome.storage.local.remove('esar_pending_bulk');
    } else if (result.esar_pending_album) {
      window.postMessage({ type: 'ESAR_PREFILL', data: result.esar_pending_album }, '*');
      console.log('[ESAR relay.js] posted single prefill message');
      chrome.storage.local.remove('esar_pending_album');
    }
  });
}, 400);
