(function(root) {
  const ns = root.TLTimelineModules = root.TLTimelineModules || {};
  const utils = ns.utils;
  const CONSTANTS = utils.CONSTANTS;
  const DEFAULT_READING_WIDTH_PX = 1276;
  const MIN_READING_WIDTH_PX = 600;
  const MAX_READING_WIDTH_PX = 1600;

  function getDefaultPrefs() {
    return {
      mode: 'collapsed',
      readingWidthEnabled: true,
      readingWidthPx: DEFAULT_READING_WIDTH_PX,
      formulaCopyEnabled: true
    };
  }

  function normalizeMode(mode) {
    return 'collapsed';
  }

  function normalizeReadingWidth(value) {
    const width = Math.round(Number(value) || DEFAULT_READING_WIDTH_PX);
    return utils.clamp(width, MIN_READING_WIDTH_PX, MAX_READING_WIDTH_PX);
  }

  function normalizeBoolean(value, fallback) {
    if (value === true || value === false) return value;
    return fallback;
  }

  function loadPrefs() {
    const defaults = getDefaultPrefs();
    if (!root.localStorage) return defaults;

    try {
      const parsed = JSON.parse(root.localStorage.getItem(CONSTANTS.PREFS_KEY) || '{}');
      return {
        mode: normalizeMode(parsed.mode || parsed.timelineMode),
        readingWidthEnabled: normalizeBoolean(parsed.readingWidthEnabled, defaults.readingWidthEnabled),
        readingWidthPx: normalizeReadingWidth(parsed.readingWidthPx),
        formulaCopyEnabled: normalizeBoolean(parsed.formulaCopyEnabled, defaults.formulaCopyEnabled)
      };
    } catch (error) {
      return defaults;
    }
  }

  function savePrefs(state) {
    if (!root.localStorage) return;
    try {
      root.localStorage.setItem(CONSTANTS.PREFS_KEY, JSON.stringify({
        mode: normalizeMode(state.prefs.mode),
        readingWidthEnabled: normalizeBoolean(state.prefs.readingWidthEnabled, true),
        readingWidthPx: normalizeReadingWidth(state.prefs.readingWidthPx),
        formulaCopyEnabled: normalizeBoolean(state.prefs.formulaCopyEnabled, true)
      }));
    } catch (error) {
      // Ignore storage failures; navigation should still work.
    }
  }

  function createState() {
    return {
      initialized: false,
      conversationId: '',
      routeToken: 0,
      lastUrl: '',
      lastSignature: '',
      prefs: loadPrefs(),
      turns: [],
      apiTurns: [],
      domTurns: [],
      domTurnCache: [],
      domCollectionReady: false,
      groups: [],
      activeGroupId: '',
      loading: false,
      error: '',
      apiCompleteness: null,
      apiRefreshAttempts: 0,
      lastApiFetchAt: 0,
      observer: null,
      bootstrapObserver: null,
      scrollEl: null,
      scrollHandler: null,
      scrollFrame: null,
      resizeFrame: null,
      refreshTimer: null,
      apiRefreshTimer: null,
      urlCheckTimer: null,
      locateTimer: null,
      highlightTimer: null,
      highlightedEl: null,
      anchorGeometryCache: null,
      ui: {}
    };
  }

  function resetConversation(state, conversationId) {
    state.routeToken += 1;
    state.conversationId = conversationId || '';
    state.lastSignature = '';
    state.turns = [];
    state.apiTurns = [];
    state.domTurns = [];
    state.domTurnCache = [];
    state.domCollectionReady = false;
    state.groups = [];
    state.activeGroupId = '';
    state.loading = false;
    state.error = '';
    state.apiCompleteness = null;
    state.apiRefreshAttempts = 0;
    state.lastApiFetchAt = 0;
    state.anchorGeometryCache = null;
  }

  ns.state = {
    getDefaultPrefs: getDefaultPrefs,
    normalizeMode: normalizeMode,
    normalizeReadingWidth: normalizeReadingWidth,
    normalizeBoolean: normalizeBoolean,
    DEFAULT_READING_WIDTH_PX: DEFAULT_READING_WIDTH_PX,
    MIN_READING_WIDTH_PX: MIN_READING_WIDTH_PX,
    MAX_READING_WIDTH_PX: MAX_READING_WIDTH_PX,
    loadPrefs: loadPrefs,
    savePrefs: savePrefs,
    createState: createState,
    resetConversation: resetConversation
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
