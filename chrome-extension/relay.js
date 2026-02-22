// relay.js — forwards chrome.storage data to webapp.html via postMessage.
//
// Apps Script serves webapp.html inside a sandboxed iframe on
// script.googleusercontent.com (not the outer script.google.com frame).
// The outer frame's warden blocks cross-origin postMessages, so this script
// must run INSIDE the iframe. We match both domains in manifest.json with
// all_frames:true, but only act when inside the googleusercontent.com frame.

(function() {
  if (window.location.hostname.indexOf('googleusercontent.com') === -1) {
    // Outer frame — do nothing. Let the inner iframe handle it.
    return;
  }

  console.log('[ESAR relay.js] active in iframe:', window.location.hostname);

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
})();
