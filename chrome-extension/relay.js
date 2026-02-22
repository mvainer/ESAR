// relay.js — runs on the Apps Script web app page (script.google.com)
// Reads pending album data written by content.js and forwards it to the
// page via postMessage so webapp.html can pre-fill the form.
// This approach survives Google auth redirects that strip URL hash/params.

setTimeout(function() {
  chrome.storage.local.get('esar_pending_album', function(result) {
    if (result.esar_pending_album) {
      window.postMessage({ type: 'ESAR_PREFILL', data: result.esar_pending_album }, '*');
      chrome.storage.local.remove('esar_pending_album');
    }
  });
}, 400);
