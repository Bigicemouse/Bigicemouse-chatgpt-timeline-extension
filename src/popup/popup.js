(function(root) {
  const STORAGE_KEY = 'tlLayoutMode';
  const MODES = ['default', 'comfortable', 'wide', 'full'];

  function normalizeLayoutMode(mode) {
    return MODES.indexOf(mode) >= 0 ? mode : 'wide';
  }

  function getButtons() {
    return Array.prototype.slice.call(root.document.querySelectorAll('[data-layout-mode]'));
  }

  function setActiveMode(mode) {
    const normalized = normalizeLayoutMode(mode);
    getButtons().forEach(function(button) {
      button.classList.toggle('is-active', button.getAttribute('data-layout-mode') === normalized);
    });
  }

  function getStoredMode(callback) {
    if (!root.chrome || !root.chrome.storage || !root.chrome.storage.local || !root.chrome.storage.local.get) {
      callback('wide');
      return;
    }
    try {
      root.chrome.storage.local.get(STORAGE_KEY, function(result) {
        callback(normalizeLayoutMode(result && result[STORAGE_KEY]));
      });
    } catch (error) {
      callback('wide');
    }
  }

  function saveStoredMode(mode) {
    if (!root.chrome || !root.chrome.storage || !root.chrome.storage.local || !root.chrome.storage.local.set) return;
    try {
      const payload = {};
      payload[STORAGE_KEY] = normalizeLayoutMode(mode);
      root.chrome.storage.local.set(payload);
    } catch (error) {
      // Ignore storage errors; the active tab message is the primary action.
    }
  }

  function sendToActiveTab(message, callback) {
    if (!root.chrome || !root.chrome.tabs || !root.chrome.tabs.query || !root.chrome.tabs.sendMessage) {
      if (callback) callback(null);
      return;
    }
    try {
      root.chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        const tab = tabs && tabs[0];
        if (!tab || !tab.id) {
          if (callback) callback(null);
          return;
        }
        root.chrome.tabs.sendMessage(tab.id, message, function(response) {
          if (callback) callback(response || null);
        });
      });
    } catch (error) {
      if (callback) callback(null);
    }
  }

  function initialize() {
    getButtons().forEach(function(button) {
      button.addEventListener('click', function() {
        const mode = normalizeLayoutMode(button.getAttribute('data-layout-mode'));
        setActiveMode(mode);
        saveStoredMode(mode);
        sendToActiveTab({ type: 'tl-set-layout-mode', layoutMode: mode }, function(response) {
          if (response && response.ok) setActiveMode(response.layoutMode);
        });
      });
    });

    getStoredMode(function(storedMode) {
      setActiveMode(storedMode);
      sendToActiveTab({ type: 'tl-get-layout-mode' }, function(response) {
        if (response && response.ok) setActiveMode(response.layoutMode);
      });
    });
  }

  if (root.document.readyState === 'loading') {
    root.document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
