(function(root) {
  const ns = root.TLTimelineModules = root.TLTimelineModules || {};

  const EXPANDED_CLASS = 'tl-timeline-expanded';
  const CONTENT_CLASS = 'tl-chat-width-expanded';
  const LAYOUT_CLASSES = ['tl-layout-default', 'tl-layout-comfortable', 'tl-layout-wide', 'tl-layout-full'];
  const CONTENT_SELECTOR = [
    'main [class*="max-w-"]',
    'main form [class*="max-w-"]',
    'main [data-message-author-role] [class*="max-w-"]',
    'form [class*="max-w-"]'
  ].join(',');

  function shouldReserveLayout(state) {
    return !!(state && state.initialized);
  }

  function getContentTargets() {
    if (!root.document || !root.document.querySelectorAll) return [];
    try {
      return Array.prototype.slice.call(root.document.querySelectorAll(CONTENT_SELECTOR)).filter(function(node) {
        return node && node.classList && !(node.closest && node.closest('#tl-chat-timeline'));
      });
    } catch (error) {
      return [];
    }
  }

  function clearContentTargets() {
    if (!root.document || !root.document.querySelectorAll) return;
    try {
      Array.prototype.slice.call(root.document.querySelectorAll('.' + CONTENT_CLASS)).forEach(function(node) {
        if (node.classList) node.classList.remove(CONTENT_CLASS);
      });
    } catch (error) {
      // Ignore selector failures; layout should never break navigation.
    }
  }

  function normalizeLayoutMode(state) {
    const mode = state && state.prefs && state.prefs.layoutMode;
    if (mode === 'default' || mode === 'comfortable' || mode === 'full') return mode;
    return 'wide';
  }

  function clearLayoutClasses(body) {
    LAYOUT_CLASSES.forEach(function(className) {
      body.classList.remove(className);
    });
  }

  function applyLayout(state) {
    const body = root.document && root.document.body;
    if (!body || !body.classList) return;
    const shouldExpand = shouldReserveLayout(state);
    if (!shouldExpand) {
      body.classList.remove(EXPANDED_CLASS);
      clearLayoutClasses(body);
      clearContentTargets();
      return;
    }
    const layoutMode = normalizeLayoutMode(state);
    body.classList.add(EXPANDED_CLASS);
    clearLayoutClasses(body);
    body.classList.add('tl-layout-' + layoutMode);
    if (layoutMode === 'default') {
      clearContentTargets();
      return;
    }
    getContentTargets().forEach(function(node) {
      if (!node.classList.contains(CONTENT_CLASS)) node.classList.add(CONTENT_CLASS);
    });
  }

  function clearLayout() {
    const body = root.document && root.document.body;
    if (body && body.classList) {
      body.classList.remove(EXPANDED_CLASS);
      clearLayoutClasses(body);
    }
    clearContentTargets();
  }

  ns.layout = {
    EXPANDED_CLASS: EXPANDED_CLASS,
    CONTENT_CLASS: CONTENT_CLASS,
    applyLayout: applyLayout,
    clearLayout: clearLayout
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
