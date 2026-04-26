(function(root) {
  const ns = root.TLTimelineModules = root.TLTimelineModules || {};
  const utils = ns.utils;
  const CONSTANTS = utils.CONSTANTS;

  function getDefaultPrefs() {
    return {
      mode: 'collapsed'
    };
  }

  function normalizeMode(mode) {
    return 'collapsed';
  }

  function loadPrefs() {
    const defaults = getDefaultPrefs();
    if (!root.localStorage) return defaults;

    try {
      const parsed = JSON.parse(root.localStorage.getItem(CONSTANTS.PREFS_KEY) || '{}');
      return {
        mode: normalizeMode(parsed.mode || parsed.timelineMode)
      };
    } catch (error) {
      return defaults;
    }
  }

  function savePrefs(state) {
    if (!root.localStorage) return;
    try {
      root.localStorage.setItem(CONSTANTS.PREFS_KEY, JSON.stringify({
        mode: normalizeMode(state.prefs.mode)
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
      refreshTimer: null,
      apiRefreshTimer: null,
      urlCheckTimer: null,
      locateTimer: null,
      highlightTimer: null,
      highlightedEl: null,
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
  }

  ns.state = {
    getDefaultPrefs: getDefaultPrefs,
    normalizeMode: normalizeMode,
    loadPrefs: loadPrefs,
    savePrefs: savePrefs,
    createState: createState,
    resetConversation: resetConversation
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
