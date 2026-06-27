(function(root) {
  const DEFAULTS = {
    readingWidthEnabled: true,
    readingWidthPx: 1276,
    formulaCopyEnabled: true
  };
  const MIN_READING_WIDTH = 600;
  const MAX_READING_WIDTH = 1600;

  function normalizeBoolean(value, fallback) {
    if (value === true || value === false) return value;
    return fallback;
  }

  function normalizeReadingWidth(value) {
    const width = Math.round(Number(value) || DEFAULTS.readingWidthPx);
    return Math.max(MIN_READING_WIDTH, Math.min(MAX_READING_WIDTH, width));
  }

  function normalizeSettings(settings) {
    const source = settings || {};
    return {
      readingWidthEnabled: normalizeBoolean(source.readingWidthEnabled, DEFAULTS.readingWidthEnabled),
      readingWidthPx: normalizeReadingWidth(source.readingWidthPx),
      formulaCopyEnabled: normalizeBoolean(source.formulaCopyEnabled, DEFAULTS.formulaCopyEnabled)
    };
  }

  function getControls() {
    return {
      formulaCopyToggle: root.document.getElementById('tl-formula-copy-toggle'),
      readingWidthToggle: root.document.getElementById('tl-reading-width-toggle'),
      readingWidthSlider: root.document.getElementById('tl-reading-width-slider'),
      readingWidthValue: root.document.getElementById('tl-reading-width-value')
    };
  }

  function setControls(settings) {
    const normalized = normalizeSettings(settings);
    const controls = getControls();
    if (controls.formulaCopyToggle) controls.formulaCopyToggle.checked = normalized.formulaCopyEnabled;
    if (controls.readingWidthToggle) controls.readingWidthToggle.checked = normalized.readingWidthEnabled;
    if (controls.readingWidthSlider) {
      controls.readingWidthSlider.value = String(normalized.readingWidthPx);
      controls.readingWidthSlider.disabled = !normalized.readingWidthEnabled;
    }
    if (controls.readingWidthValue) controls.readingWidthValue.textContent = String(normalized.readingWidthPx);
  }

  function getStoredSettings(callback) {
    if (!root.chrome || !root.chrome.storage || !root.chrome.storage.local || !root.chrome.storage.local.get) {
      callback(DEFAULTS);
      return;
    }
    try {
      root.chrome.storage.local.get(['tlReadingWidthEnabled', 'tlReadingWidthPx', 'tlFormulaCopyEnabled'], function(result) {
        callback(normalizeSettings({
          readingWidthEnabled: result && result.tlReadingWidthEnabled,
          readingWidthPx: result && result.tlReadingWidthPx,
          formulaCopyEnabled: result && result.tlFormulaCopyEnabled
        }));
      });
    } catch (error) {
      callback(DEFAULTS);
    }
  }

  function saveStoredSettings(settings) {
    if (!root.chrome || !root.chrome.storage || !root.chrome.storage.local || !root.chrome.storage.local.set) return;
    try {
      const normalized = normalizeSettings(settings);
      root.chrome.storage.local.set({
        tlReadingWidthEnabled: normalized.readingWidthEnabled,
        tlReadingWidthPx: normalized.readingWidthPx,
        tlFormulaCopyEnabled: normalized.formulaCopyEnabled
      });
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
    const controls = getControls();

    if (controls.formulaCopyToggle) {
      controls.formulaCopyToggle.addEventListener('change', function() {
        const enabled = !!controls.formulaCopyToggle.checked;
        sendToActiveTab({ type: 'tl-set-formula-copy-enabled', enabled: enabled }, function(response) {
          const settings = response && response.ok ? response : Object.assign({}, DEFAULTS, { formulaCopyEnabled: enabled });
          setControls(settings);
          saveStoredSettings(settings);
        });
      });
    }

    if (controls.readingWidthToggle) {
      controls.readingWidthToggle.addEventListener('change', function() {
        const enabled = !!controls.readingWidthToggle.checked;
        sendToActiveTab({ type: 'tl-set-reading-width-enabled', enabled: enabled }, function(response) {
          const settings = response && response.ok ? response : Object.assign({}, DEFAULTS, {
            readingWidthEnabled: enabled,
            readingWidthPx: controls.readingWidthSlider ? controls.readingWidthSlider.value : DEFAULTS.readingWidthPx
          });
          setControls(settings);
          saveStoredSettings(settings);
        });
      });
    }

    if (controls.readingWidthSlider) {
      controls.readingWidthSlider.addEventListener('input', function() {
        const width = normalizeReadingWidth(controls.readingWidthSlider.value);
        setControls({
          readingWidthEnabled: controls.readingWidthToggle ? controls.readingWidthToggle.checked : true,
          readingWidthPx: width,
          formulaCopyEnabled: controls.formulaCopyToggle ? controls.formulaCopyToggle.checked : true
        });
        sendToActiveTab({ type: 'tl-set-reading-width', readingWidthPx: width }, function(response) {
          const settings = response && response.ok ? response : Object.assign({}, DEFAULTS, {
            readingWidthEnabled: controls.readingWidthToggle ? controls.readingWidthToggle.checked : true,
            readingWidthPx: width,
            formulaCopyEnabled: controls.formulaCopyToggle ? controls.formulaCopyToggle.checked : true
          });
          setControls(settings);
          saveStoredSettings(settings);
        });
      });
    }

    getStoredSettings(function(storedSettings) {
      setControls(storedSettings);
      sendToActiveTab({ type: 'tl-get-plugin-settings' }, function(response) {
        if (response && response.ok) {
          setControls(response);
          saveStoredSettings(response);
        }
      });
    });
  }

  if (root.document.readyState === 'loading') {
    root.document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
