(function(root) {
  const ns = root.TLTimelineModules = root.TLTimelineModules || {};

  const READABLE_CLASS = 'gv-plugin-chatgpt-readable';
  const READING_WIDTH_VAR = '--gv-plugin-reading-width';

  function getReadingWidth(state) {
    const stateModule = ns.state;
    if (stateModule && stateModule.normalizeReadingWidth) {
      return stateModule.normalizeReadingWidth(state && state.prefs && state.prefs.readingWidthPx);
    }
    return 1276;
  }

  function applyLayout(state) {
    const body = root.document && root.document.body;
    if (!body || !body.classList) return;
    if (!state || !state.initialized || !state.prefs || state.prefs.readingWidthEnabled === false) {
      clearLayout();
      return;
    }
    body.classList.add(READABLE_CLASS);
    body.style.setProperty(READING_WIDTH_VAR, getReadingWidth(state) + 'px');
  }

  function clearLayout() {
    const body = root.document && root.document.body;
    if (body && body.classList) {
      body.classList.remove(READABLE_CLASS);
      body.style.removeProperty(READING_WIDTH_VAR);
    }
  }

  ns.layout = {
    READABLE_CLASS: READABLE_CLASS,
    READING_WIDTH_VAR: READING_WIDTH_VAR,
    applyLayout: applyLayout,
    clearLayout: clearLayout
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
