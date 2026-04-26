(function(root) {
  const ns = root.TLTimelineModules = root.TLTimelineModules || {};
  const TOKEN_KEYS = ['accessToken', 'tokenTimestamp', 'tokenSource', 'tokenInfo'];
  const TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000;
  let cachedAuthInfo = null;

  function getStorageArea() {
    return root.chrome && root.chrome.storage && root.chrome.storage.local;
  }

  function storageGet(keys) {
    const storage = getStorageArea();
    if (!storage || !storage.get) return Promise.resolve({});

    return new Promise(function(resolve) {
      let settled = false;

      function finish(value) {
        if (settled) return;
        settled = true;
        resolve(value || {});
      }

      try {
        const maybePromise = storage.get(keys, finish);
        if (maybePromise && typeof maybePromise.then === 'function') {
          maybePromise.then(finish).catch(function() { finish({}); });
        }
      } catch (error) {
        finish({});
      }
    });
  }

  function storageRemove(keys) {
    const storage = getStorageArea();
    if (!storage || !storage.remove) return Promise.resolve();

    return new Promise(function(resolve) {
      let settled = false;

      function finish() {
        if (settled) return;
        settled = true;
        resolve();
      }

      try {
        const maybePromise = storage.remove(keys, finish);
        if (maybePromise && typeof maybePromise.then === 'function') {
          maybePromise.then(finish).catch(finish);
        }
      } catch (error) {
        finish();
      }
    });
  }

  function getCookie(name) {
    const cookies = String(root.document && root.document.cookie || '').split(';');
    for (let index = 0; index < cookies.length; index += 1) {
      const pair = cookies[index].trim();
      const equalsIndex = pair.indexOf('=');
      const cookieName = equalsIndex >= 0 ? pair.slice(0, equalsIndex) : pair;
      if (cookieName === name) {
        try {
          return decodeURIComponent(pair.slice(equalsIndex + 1));
        } catch (error) {
          return pair.slice(equalsIndex + 1);
        }
      }
    }
    return '';
  }

  function isFreshToken(timestamp) {
    const value = Number(timestamp);
    if (!Number.isFinite(value) || value <= 0) return false;
    return Date.now() - value < TOKEN_MAX_AGE_MS;
  }

  function loadAuthInfo(forceRefresh) {
    if (cachedAuthInfo && !forceRefresh) return Promise.resolve(cachedAuthInfo);

    return storageGet(['accessToken', 'tokenTimestamp', 'tokenSource']).then(function(stored) {
      const token = stored.accessToken && isFreshToken(stored.tokenTimestamp) ? String(stored.accessToken) : '';
      cachedAuthInfo = {
        accessToken: token,
        accountId: getCookie('_account'),
        deviceId: getCookie('oai-did'),
        source: token ? (stored.tokenSource || 'auto') : 'none'
      };
      return cachedAuthInfo;
    });
  }

  function buildAuthHeaders() {
    return loadAuthInfo(false).then(function(authInfo) {
      const headers = {
        accept: 'application/json',
        'oai-language': 'zh-CN'
      };

      if (authInfo.accessToken) {
        headers.authorization = 'Bearer ' + authInfo.accessToken;
      }
      if (authInfo.accountId) {
        headers['chatgpt-account-id'] = authInfo.accountId;
      }
      if (authInfo.deviceId) {
        headers['oai-device-id'] = authInfo.deviceId;
      }
      return headers;
    });
  }

  function clearAuthCache(clearStoredToken) {
    cachedAuthInfo = null;
    if (clearStoredToken) return storageRemove(TOKEN_KEYS);
    return Promise.resolve();
  }

  ns.auth = {
    loadAuthInfo: loadAuthInfo,
    buildAuthHeaders: buildAuthHeaders,
    clearAuthCache: clearAuthCache
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
