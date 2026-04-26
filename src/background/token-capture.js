(function(root) {
  const TOKEN_KEYS = {
    accessToken: 'accessToken',
    tokenTimestamp: 'tokenTimestamp',
    tokenSource: 'tokenSource',
    tokenInfo: 'tokenInfo'
  };
  const TARGET_URLS = ['https://chatgpt.com/*'];
  let latestToken = '';

  function isBearerToken(value) {
    const token = String(value || '');
    return token.indexOf('Bearer ') === 0 && token.slice(7).length > 20;
  }

  function saveToken(accessToken, sourceUrl) {
    if (!root.chrome || !root.chrome.storage || !root.chrome.storage.local) return;
    if (!accessToken || accessToken === latestToken) return;
    latestToken = accessToken;

    root.chrome.storage.local.set({
      [TOKEN_KEYS.accessToken]: accessToken,
      [TOKEN_KEYS.tokenTimestamp]: Date.now(),
      [TOKEN_KEYS.tokenSource]: 'auto',
      [TOKEN_KEYS.tokenInfo]: {
        timestamp: Date.now(),
        url: sourceUrl,
        source: 'auto'
      }
    }, function() {
      if (root.chrome.runtime && root.chrome.runtime.lastError) {
        console.warn('[TimelineTokenCapture] Token storage failed');
        return;
      }
      console.info('[TimelineTokenCapture] Token captured from ChatGPT request');
    });
  }

  function handleSendHeaders(details) {
    if (!details || !Array.isArray(details.requestHeaders)) return;
    if (details.type !== 'xmlhttprequest' && details.type !== 'main_frame') return;

    for (let index = 0; index < details.requestHeaders.length; index += 1) {
      const header = details.requestHeaders[index];
      if (!header || String(header.name || '').toLowerCase() !== 'authorization') continue;
      if (!isBearerToken(header.value)) continue;
      saveToken(String(header.value).slice(7), details.url || '');
      return;
    }
  }

  function init() {
    if (!root.chrome || !root.chrome.webRequest || !root.chrome.webRequest.onSendHeaders) {
      console.warn('[TimelineTokenCapture] webRequest API unavailable');
      return;
    }

    root.chrome.webRequest.onSendHeaders.addListener(
      handleSendHeaders,
      { urls: TARGET_URLS },
      ['requestHeaders', 'extraHeaders']
    );
    console.info('[TimelineTokenCapture] Listening for ChatGPT auth headers');
  }

  init();
})(typeof globalThis !== 'undefined' ? globalThis : this);
