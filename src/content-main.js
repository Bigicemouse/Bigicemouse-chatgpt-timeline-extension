(function(root) {
  const ns = root.TLTimelineModules = root.TLTimelineModules || {};
  const utils = ns.utils;
  const stateModule = ns.state;
  const auth = ns.auth;
  const api = ns.conversationApi;
  const dom = ns.domCollector;
  const locator = ns.locator;
  const timeline = ns.timeline;
  const layout = ns.layout;
  const geometry = ns.geometry;
  const virtualList = ns.virtualList;
  const exportFeature = ns.exportFeature;
  const CONSTANTS = utils.CONSTANTS;
  const CONVERSATION_OBSERVER_CONFIG = {
    childList: true,
    subtree: true,
    characterData: false
  };
  const REFRESH_DEBOUNCE_MS = 220;
  const STREAMING_REFRESH_DEBOUNCE_MS = 1000;
  const hasDom = !!(root && root.document && root.location);
  const state = stateModule.createState();

  function clearTimers() {
    ['refreshTimer', 'apiRefreshTimer', 'locateTimer', 'highlightTimer'].forEach(function(key) {
      if (state[key]) root.clearTimeout(state[key]);
      state[key] = null;
    });
    cancelFrame(state, 'scrollFrame');
    cancelFrame(state, 'resizeFrame');
  }

  function requestFrame(callback) {
    if (root.requestAnimationFrame) return root.requestAnimationFrame(callback);
    return root.setTimeout(callback, 16);
  }

  function cancelFrame(targetState, key) {
    if (!targetState || !targetState[key]) return;
    if (root.cancelAnimationFrame) {
      root.cancelAnimationFrame(targetState[key]);
    } else {
      root.clearTimeout(targetState[key]);
    }
    targetState[key] = null;
  }

  function disconnectRuntime() {
    if (state.observer) {
      state.observer.disconnect();
      state.observer = null;
    }
    if (state.scrollEl && state.scrollHandler) {
      state.scrollEl.removeEventListener('scroll', state.scrollHandler);
    }
    state.scrollEl = null;
    state.scrollHandler = null;
    clearTimers();
  }

  function stopBootstrapObserver() {
    if (state.bootstrapObserver) {
      state.bootstrapObserver.disconnect();
      state.bootstrapObserver = null;
    }
  }

  function startBootstrapObserver() {
    if (state.bootstrapObserver || !root.MutationObserver || !root.document.body) return;
    state.bootstrapObserver = new MutationObserver(function() {
      if (utils.shouldInitializeConversation(root.location && root.location.href, dom.collectTurnSections().length > 0)) {
        handleRouteChange(false);
      }
    });
    state.bootstrapObserver.observe(root.document.body, { childList: true, subtree: true });
  }

  function destroy() {
    disconnectRuntime();
    timeline.destroyUI(state);
    stateModule.resetConversation(state, '');
    state.initialized = false;
    state.lastUrl = root.location && root.location.href || '';
  }

  function isRouteCurrent(targetState, routeToken, conversationId) {
    return !!(targetState &&
      targetState.routeToken === routeToken &&
      targetState.conversationId === conversationId);
  }

  function applyTurns(sourceTurns, force) {
    const nextTurns = utils.mergeTurnsById(state.turns, sourceTurns);
    const signature = utils.buildConversationSignature(nextTurns);
    if (!force && signature === state.lastSignature) return false;

    state.turns = nextTurns;
    state.groups = utils.buildQaGroups(nextTurns);
    state.lastSignature = signature;
    state.anchorGeometryCache = null;
    state.activeGroupId = locator.computeActiveGroupId(state) || state.activeGroupId || (state.groups[0] && state.groups[0].id) || '';
    timeline.render(state, actions);
    return true;
  }

  function refreshFromDom(force, routeToken, conversationId) {
    if (routeToken && !isRouteCurrent(state, routeToken, conversationId)) return false;
    if (!state.domCollectionReady) {
      if (state.apiTurns.length || force) return applyTurns(state.apiTurns, !!force);
      return false;
    }
    state.domTurns = dom.collectTurns();
    state.domTurnCache = dom.cacheDomTurns(state.domTurnCache, state.domTurns);
    const cachedDomTurns = dom.attachDomElementsToTurns(state.domTurnCache, state.domTurns);
    const mergedSource = state.apiTurns.length ? utils.mergeTurnsById(state.apiTurns, cachedDomTurns) : cachedDomTurns;
    const sourceTurns = dom.attachDomElementsToTurns(mergedSource, state.domTurns);
    if (sourceTurns.length || force) return applyTurns(sourceTurns, !!force);
    return false;
  }

  function shouldFetchConversation(targetState, now) {
    const currentTime = Number(now) || 0;
    if (!targetState.conversationId || targetState.conversationId.indexOf('dom:') === 0 || targetState.loading) return false;
    if (targetState.apiRefreshAttempts >= CONSTANTS.API_REFRESH_MAX_ATTEMPTS) return false;
    if (!targetState.apiTurns.length) return true;
    return currentTime - (targetState.lastApiFetchAt || 0) >= CONSTANTS.API_REFRESH_RETRY_MS;
  }

  function scheduleApiRefresh(routeToken, conversationId) {
    const token = routeToken || state.routeToken;
    const id = conversationId || state.conversationId;
    if (state.apiRefreshTimer || !isRouteCurrent(state, token, id) || !shouldFetchConversation(state, Date.now() + CONSTANTS.API_REFRESH_RETRY_MS)) return;
    state.apiRefreshTimer = root.setTimeout(function() {
      state.apiRefreshTimer = null;
      if (isRouteCurrent(state, token, id)) fetchConversation(token, id);
    }, CONSTANTS.API_REFRESH_RETRY_MS);
  }

  function fetchConversation(routeToken, conversationId) {
    const token = routeToken || state.routeToken;
    const id = conversationId || state.conversationId;
    if (!isRouteCurrent(state, token, id)) return;
    if (!shouldFetchConversation(state, Date.now())) return;
    if (state.apiRefreshTimer) {
      root.clearTimeout(state.apiRefreshTimer);
      state.apiRefreshTimer = null;
    }
    state.loading = !state.apiTurns.length;
    state.error = '';
    state.lastApiFetchAt = Date.now();
    state.apiRefreshAttempts += 1;
    if (state.loading) timeline.render(state, actions);

    api.fetchConversationJson(id).then(function(data) {
      if (!isRouteCurrent(state, token, id)) return;
      state.loading = false;
      const apiResult = api.collectTurnsWithMetadata
        ? api.collectTurnsWithMetadata(data)
        : { turns: api.collectTurnsFromConversationData(data), metadata: null };
      const nextApiTurns = apiResult.turns || [];
      state.apiCompleteness = apiResult.metadata || null;
      if (!nextApiTurns.length) {
        state.error = 'Conversation API returned no readable turns.';
        refreshFromDom(true, token, id);
        scheduleApiRefresh(token, id);
        return;
      }
      state.apiTurns = utils.mergeTurnsById(state.apiTurns, nextApiTurns);
      refreshFromDom(true, token, id);
      scheduleApiRefresh(token, id);
    }).catch(function(error) {
      if (!isRouteCurrent(state, token, id)) return;
      state.loading = false;
      state.error = String(error && error.message ? error.message : error || 'Conversation API failed.');
      state.apiCompleteness = {
        pathTurnCount: 0,
        allReadableMappingTurnCount: 0,
        usedFallback: false,
        apiCompleteLikely: false,
        reason: 'api-error'
      };
      refreshFromDom(true, token, id);
      scheduleApiRefresh(token, id);
    });
  }

  function scheduleRefresh(force, routeToken, conversationId, delayMs) {
    const token = routeToken || state.routeToken;
    const id = conversationId || state.conversationId;
    const delay = Math.max(0, Number(delayMs) || REFRESH_DEBOUNCE_MS);
    if (!isRouteCurrent(state, token, id)) return;
    if (state.refreshTimer) root.clearTimeout(state.refreshTimer);
    state.refreshTimer = root.setTimeout(function() {
      if (isRouteCurrent(state, token, id)) refreshFromDom(!!force, token, id);
    }, delay);
  }

  function isAssistantStreaming() {
    return !!(utils.qs('[data-testid="stop-button"]') ||
      utils.qs('button[aria-label*="停止"]') ||
      utils.qs('button[aria-label*="Stop"]'));
  }

  function getConversationObserverConfig() {
    return Object.assign({}, CONVERSATION_OBSERVER_CONFIG);
  }

  function isTimelineNode(node) {
    if (!node || node.nodeType !== 1) return false;
    if (node.id === CONSTANTS.PANEL_ID || node.id === CONSTANTS.STYLE_ID) return true;
    return !!(node.closest && node.closest('#' + CONSTANTS.PANEL_ID));
  }

  function mutationBelongsToTimeline(mutation) {
    if (!mutation) return false;
    if (isTimelineNode(mutation.target)) return true;
    const added = Array.prototype.slice.call(mutation.addedNodes || []);
    const removed = Array.prototype.slice.call(mutation.removedNodes || []);
    const touched = added.concat(removed);
    return touched.length > 0 && touched.every(isTimelineNode);
  }

  function shouldIgnoreMutationBatch(mutations) {
    const list = Array.prototype.slice.call(mutations || []);
    return list.length > 0 && list.every(mutationBelongsToTimeline);
  }

  function hasLayoutRelevantMutation(mutations) {
    return Array.prototype.slice.call(mutations || []).some(function(mutation) {
      if (!mutation || mutation.type !== 'childList') return false;
      if (mutationBelongsToTimeline(mutation)) return false;
      return (mutation.addedNodes && mutation.addedNodes.length) || (mutation.removedNodes && mutation.removedNodes.length);
    });
  }

  function observeConversation() {
    if (state.observer || !root.MutationObserver || !root.document.body) return;
    const target = utils.qs('main') || root.document.body;
    state.observer = new MutationObserver(function(mutations) {
      if (shouldIgnoreMutationBatch(mutations)) return;
      if (root.location && root.location.href !== state.lastUrl) {
        handleRouteChange(false);
        return;
      }
      state.anchorGeometryCache = null;
      if (state.initialized && layout && hasLayoutRelevantMutation(mutations)) layout.applyLayout(state);
      state.domCollectionReady = true;
      scheduleRefresh(
        false,
        state.routeToken,
        state.conversationId,
        isAssistantStreaming() ? STREAMING_REFRESH_DEBOUNCE_MS : REFRESH_DEBOUNCE_MS
      );
    });
    state.observer.observe(target, CONVERSATION_OBSERVER_CONFIG);
  }

  function bindScrollSpy() {
    const targetState = arguments.length > 0 && arguments[0] ? arguments[0] : state;
    const explicitScrollEl = arguments.length > 1 ? arguments[1] : null;
    const nextScrollEl = explicitScrollEl || locator.findScrollTarget();
    if (!nextScrollEl || targetState.scrollEl === nextScrollEl) return;
    if (targetState.scrollEl && targetState.scrollHandler) {
      targetState.scrollEl.removeEventListener('scroll', targetState.scrollHandler);
    }
    cancelFrame(targetState, 'scrollFrame');
    targetState.anchorGeometryCache = null;
    targetState.scrollEl = nextScrollEl;
    targetState.scrollHandler = function() {
      scheduleScrollSpyUpdate(targetState);
    };
    targetState.scrollEl.addEventListener('scroll', targetState.scrollHandler, { passive: true });
  }

  function scheduleScrollSpyUpdate(targetState) {
    if (!targetState || targetState.scrollFrame) return;
    targetState.scrollFrame = requestFrame(function() {
      targetState.scrollFrame = null;
      updateActiveGroupFromScroll(targetState);
    });
  }

  function updateActiveGroupFromScroll(targetState) {
    const nextActive = locator.computeActiveGroupId(targetState);
    if (nextActive && nextActive !== targetState.activeGroupId) {
      targetState.activeGroupId = nextActive;
      timeline.updateActiveClasses(targetState);
    }
  }

  function scheduleResizeRefresh() {
    if (state.resizeFrame) return;
    state.resizeFrame = requestFrame(function() {
      state.resizeFrame = null;
      if (!state.initialized) return;
      state.anchorGeometryCache = null;
      if (layout) layout.applyLayout(state);
      timeline.render(state, actions);
    });
  }

  function initConversation(conversationId) {
    stopBootstrapObserver();
    if (state.initialized && state.conversationId === conversationId) {
      scheduleRefresh(false, state.routeToken, conversationId);
      fetchConversation(state.routeToken, conversationId);
      return;
    }

    disconnectRuntime();
    stateModule.resetConversation(state, conversationId);
    const routeToken = state.routeToken;
    state.initialized = true;
    state.domCollectionReady = conversationId.indexOf('dom:') === 0;
    state.lastUrl = root.location.href;
    timeline.ensureUI(state, actions);
    if (layout) layout.applyLayout(state);
    timeline.render(state, actions);
    bindScrollSpy();
    observeConversation();
    if (conversationId.indexOf('dom:') === 0) {
      scheduleRefresh(true, routeToken, conversationId);
    } else {
      fetchConversation(routeToken, conversationId);
    }
  }

  function handleRouteChange(force) {
    const url = root.location && root.location.href;
    const conversationId = utils.getConversationIdFromUrl(url);
    const hasConversationTurns = conversationId ? false : dom.collectTurnSections().length > 0;

    if (!utils.shouldInitializeConversation(url, hasConversationTurns)) {
      if (state.initialized || force) destroy();
      state.lastUrl = url || '';
      startBootstrapObserver();
      return;
    }
    initConversation(conversationId || ('dom:' + url));
  }

  function hookHistory() {
    if (root.__tlTimelineHistoryHooked__) return;
    root.__tlTimelineHistoryHooked__ = true;
    const rawPushState = root.history.pushState;
    const rawReplaceState = root.history.replaceState;

    root.history.pushState = function() {
      rawPushState.apply(this, arguments);
      root.setTimeout(function() { handleRouteChange(false); }, 80);
    };
    root.history.replaceState = function() {
      rawReplaceState.apply(this, arguments);
      root.setTimeout(function() { handleRouteChange(false); }, 80);
    };
    root.addEventListener('popstate', function() { handleRouteChange(false); });
    root.addEventListener('resize', function() {
      if (state.initialized) scheduleResizeRefresh();
    }, { passive: true });
    if (!state.urlCheckTimer) {
      state.urlCheckTimer = root.setInterval(function() {
        if (root.location && root.location.href !== state.lastUrl) handleRouteChange(false);
      }, CONSTANTS.ROUTE_POLL_MS);
    }
  }

  function getExportTitle() {
    const rawTitle = root.document && root.document.title || 'ChatGPT Conversation';
    return utils.normalizeText(rawTitle.replace(/\s*[-|]\s*ChatGPT\s*$/i, '')) || 'ChatGPT Conversation';
  }

  function buildExportOptions(options) {
    return {
      title: getExportTitle(),
      url: root.location && root.location.href || '',
      exportedAt: new Date().toISOString(),
      includeUser: !(options && options.includeUser === false),
      includeAssistant: !(options && options.includeAssistant === false),
      selectedGroupIds: Array.isArray(options && options.selectedGroupIds) ? options.selectedGroupIds.slice() : null
    };
  }

  function exportMarkdown(options) {
    if (!exportFeature || !exportFeature.formatConversationMarkdown || !exportFeature.downloadTextFile) return;
    const exportOptions = buildExportOptions(options);
    const content = exportFeature.formatConversationMarkdown(state.groups, exportOptions);
    const filename = exportFeature.buildExportFilename(exportOptions.title, 'md');
    exportFeature.downloadTextFile(filename, 'text/markdown;charset=utf-8', content);
  }

  function exportPdf(options) {
    if (!exportFeature || !exportFeature.formatConversationPrintHtml) return;
    const exportOptions = buildExportOptions(options);
    const html = exportFeature.formatConversationPrintHtml(state.groups, exportOptions);
    const printWindow = root.open && root.open('', '_blank');

    if (!printWindow || !printWindow.document) return;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.setTimeout(function() {
      printWindow.print();
    }, 120);
  }

  const actions = {
    jumpToGroup: function(group) {
      if (!group || !group.anchorTurn) return;
      state.activeGroupId = group.id;
      timeline.updateActiveClasses(state);
      locator.jumpToTurn(state, group.anchorTurn);
    },
    exportConversation: function(format, options) {
      if (!state.groups.length) return;
      if (format === 'pdf') {
        exportPdf(options);
        return;
      }
      exportMarkdown(options);
    },
    setLayoutMode: function(mode) {
      state.prefs.layoutMode = stateModule.normalizeLayoutMode(mode);
      stateModule.savePrefs(state);
      if (layout) layout.applyLayout(state);
      timeline.render(state, actions);
    }
  };

  const testApi = {
    normalizeText: utils.normalizeText,
    truncate: utils.truncate,
    isConversationPage: utils.isConversationPage,
    shouldInitializeConversation: utils.shouldInitializeConversation,
    getConversationIdFromUrl: utils.getConversationIdFromUrl,
    getConversationApiUrls: utils.getConversationApiUrls,
    buildQaGroups: utils.buildQaGroups,
    buildRailTimelineItems: utils.buildRailTimelineItems,
    mergeTurnsById: utils.mergeTurnsById,
    buildConversationSignature: utils.buildConversationSignature,
    shouldFetchConversation: shouldFetchConversation,
    isRouteCurrent: isRouteCurrent,
    buildAuthHeaders: auth && auth.buildAuthHeaders,
    clearAuthCache: auth && auth.clearAuthCache,
    collectTurnsFromConversationData: api.collectTurnsFromConversationData,
    collectTurnsWithMetadata: api.collectTurnsWithMetadata,
    fetchConversationJson: api.fetchConversationJson,
    collectTurnSections: dom.collectTurnSections,
    collectTurnsFromSections: dom.collectTurnsFromSections,
    cacheDomTurns: dom.cacheDomTurns,
    attachDomElementsToTurns: dom.attachDomElementsToTurns,
    buildTimelineGeometry: geometry && geometry.buildTimelineGeometry,
    computeVirtualWindow: virtualList && virtualList.computeVirtualWindow,
    jumpToTurn: locator.jumpToTurn,
    findScrollTarget: locator.findScrollTarget,
    getCollapsedItems: timeline.getCollapsedItems,
    renderTimeline: timeline.render,
    setTimelineMode: timeline.setMode,
    getTimelineStatusText: timeline.getTimelineStatusText,
    createState: stateModule.createState,
    resetConversation: stateModule.resetConversation,
    applyLayout: layout && layout.applyLayout,
    clearLayout: layout && layout.clearLayout,
    bindScrollSpy: bindScrollSpy,
    getConversationObserverConfig: getConversationObserverConfig,
    shouldIgnoreMutationBatch: shouldIgnoreMutationBatch,
    getDefaultPrefs: stateModule.getDefaultPrefs,
    normalizeLayoutMode: stateModule.normalizeLayoutMode,
    savePrefs: stateModule.savePrefs,
    formatConversationMarkdown: exportFeature && exportFeature.formatConversationMarkdown,
    formatConversationPrintHtml: exportFeature && exportFeature.formatConversationPrintHtml,
    formatConversationJson: exportFeature && exportFeature.formatConversationJson,
    buildExportFilename: exportFeature && exportFeature.buildExportFilename
  };

  root.__TL_TEST_API__ = testApi;
  ns.app = {
    state: state,
    initConversation: initConversation,
    destroy: destroy,
    handleRouteChange: handleRouteChange,
    refreshFromDom: refreshFromDom,
    fetchConversation: fetchConversation
  };

  if (!hasDom || !root.location.hostname.includes('chatgpt.com')) return;
  hookHistory();
  if (root.document.readyState === 'loading') {
    root.document.addEventListener('DOMContentLoaded', function() { handleRouteChange(true); });
  } else {
    handleRouteChange(true);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
