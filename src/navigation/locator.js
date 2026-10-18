(function(root) {
  const ns = root.TLTimelineModules = root.TLTimelineModules || {};
  const utils = ns.utils;
  const domCollector = ns.domCollector;
  const geometry = ns.geometry;
  const CONSTANTS = utils.CONSTANTS;

  function getMetrics(element) {
    if (!element) return { scrollTop: 0, scrollHeight: 0, clientHeight: 0, maxTop: 0 };
    const scrollHeight = Math.max(0, Number(element.scrollHeight) || 0);
    const clientHeight = Math.max(0, Number(element.clientHeight) || 0);
    const scrollTop = Math.max(0, Number(element.scrollTop) || 0);
    return {
      scrollTop: scrollTop,
      scrollHeight: scrollHeight,
      clientHeight: clientHeight,
      maxTop: Math.max(0, scrollHeight - clientHeight)
    };
  }

  function isScrollable(element) {
    const metrics = getMetrics(element);
    let overflowY = '';
    if (metrics.maxTop <= 120) return false;
    try {
      overflowY = root.getComputedStyle(element).overflowY || '';
    } catch (error) {
      overflowY = '';
    }
    return /auto|scroll|overlay/i.test(overflowY) || metrics.scrollTop > 0;
  }

  function findScrollTarget() {
    const conversationRoot = domCollector.getConversationRoot();
    if (conversationRoot && conversationRoot !== root.document) return conversationRoot;
    const documentTarget = root.document.scrollingElement || root.document.documentElement || root.document.body;
    const candidates = [];
    let element = utils.qs('main');
    let best = null;
    let bestRange = 0;

    function add(candidate) {
      if (candidate && candidates.indexOf(candidate) === -1) candidates.push(candidate);
    }

    while (element && element !== root.document.body) {
      add(element);
      element = element.parentElement;
    }
    add(utils.qs('main'));
    add(documentTarget);
    add(root.document.body);
    add(root.document.documentElement);
    utils.qsa('main [class*="overflow"], main [style*="overflow"], [data-radix-scroll-area-viewport]').forEach(add);

    candidates.forEach(function(candidate) {
      const metrics = getMetrics(candidate);
      if (isScrollable(candidate) && metrics.maxTop > bestRange) {
        best = candidate;
        bestRange = metrics.maxTop;
      }
    });
    return best || documentTarget;
  }

  function findVisibleDomTurn(turn, turns) {
    const exact = domCollector.findTurnElement(turn);
    if (exact) return Object.assign({}, turn, { el: exact, seenInCurrentDom: true });
    // Identified messages must not fall back to an unrelated repeated prompt.
    if (turn.apiMessageId && domCollector.getConversationRoot() !== root.document) return null;
    const sources = turns && turns.indexOf(turn) >= 0 ? turns : [turn];
    const matches = domCollector.attachDomElementsToTurns(sources, domCollector.collectTurns());
    const match = matches[sources.indexOf(turn)];
    return match && match.el ? match : null;
  }

  function highlightTurn(state, target) {
    if (!target || !target.classList) return;
    if (state.highlightedEl && state.highlightedEl !== target) {
      state.highlightedEl.classList.remove('tl-turn-focus');
    }
    if (state.highlightTimer) root.clearTimeout(state.highlightTimer);
    target.classList.add('tl-turn-focus');
    state.highlightedEl = target;
    state.highlightTimer = root.setTimeout(function() {
      if (state.highlightedEl) state.highlightedEl.classList.remove('tl-turn-focus');
      state.highlightedEl = null;
      state.highlightTimer = null;
    }, CONSTANTS.HIGHLIGHT_DURATION_MS);
  }

  function scrollVisibleTurnIntoView(state, turn, domTurn) {
    if (!domTurn || !domTurn.el || !domTurn.el.scrollIntoView) return false;
    turn.el = domTurn.el;
    domTurn.el.scrollIntoView({ behavior: 'instant', block: 'start' });
    state.anchorGeometryCache = null;
    highlightTurn(state, domTurn.el);
    return true;
  }

  function jumpToTurn(state, turn) {
    if (state.locateTimer) root.clearTimeout(state.locateTimer);
    state.locateTimer = null;
    const visibleMatch = findVisibleDomTurn(turn, state.turns);
    const routeToken = state.routeToken;
    const conversationId = state.conversationId;
    const jumpToken = state.jumpToken = (state.jumpToken || 0) + 1;
    const alreadyFound = scrollVisibleTurnIntoView(state, turn, visibleMatch);
    // An exact mounted target needs one scroll only. Rechecking it every 260 ms
    // forces layout and can fight the user's next scroll or next marker click.
    if (alreadyFound) return;
    const target = findScrollTarget();
    const metrics = getMetrics(target);
    const index = Math.max(0, state.turns.findIndex(function(item) { return item.id === turn.id; }));
    const ratio = state.turns.length > 1 ? index / (state.turns.length - 1) : 0;
    const estimatedTop = utils.clamp(Math.round(metrics.maxTop * ratio - metrics.clientHeight * 0.28), 0, metrics.maxTop);

    if (!target) return;
    target.scrollTop = estimatedTop;
    let attempts = 0;
    let low = 0;
    let high = metrics.maxTop;
    let lastHeight = metrics.scrollHeight;
    function settle() {
      state.locateTimer = null;
      if (state.routeToken !== routeToken || state.conversationId !== conversationId || state.jumpToken !== jumpToken) return;
      attempts += 1;
      const match = findVisibleDomTurn(turn, state.turns);
      if (match) {
        scrollVisibleTurnIntoView(state, turn, match);
        return;
      } else {
        // Virtualized pages can mount only a window of turns. Bound the search by
        // known message order instead of assuming equally sized answers.
        const nextMetrics = getMetrics(target);
        if (lastHeight !== nextMetrics.scrollHeight) {
          low = 0;
          high = nextMetrics.maxTop;
          lastHeight = nextMetrics.scrollHeight;
        }
        const renderedIds = new Set();
        utils.qsa('[data-chatgpt-search-message-ids]', domCollector.getConversationRoot()).forEach(function(node) {
          String(node.getAttribute('data-chatgpt-search-message-ids') || '').split(/\s+/).forEach(function(id) { renderedIds.add(id); });
        });
        const indexes = [];
        state.turns.forEach(function(item, position) { if (renderedIds.has(item.apiMessageId)) indexes.push(position); });
        if (indexes.length) {
          if (index < indexes[0]) high = nextMetrics.scrollTop;
          else if (index > indexes[indexes.length - 1]) low = nextMetrics.scrollTop;
          else return;
          target.scrollTop = (low + high) / 2;
        }
      }
      if (attempts < 10) state.locateTimer = root.setTimeout(settle, CONSTANTS.JUMP_SETTLE_DELAY_MS);
    }
    state.locateTimer = root.setTimeout(settle, CONSTANTS.JUMP_SETTLE_DELAY_MS);
  }

  function computeActiveGroupId(state) {
    let activeId = state.groups.length ? state.groups[0].id : '';
    const scrollTarget = state.scrollEl || findScrollTarget();
    const metrics = getMetrics(scrollTarget);
    const referenceTop = metrics.scrollTop + metrics.clientHeight * 0.45;
    const entries = getCachedAnchorEntries(state, scrollTarget);

    entries.forEach(function(entry) {
      if (!Number.isFinite(entry.anchorTop)) return;
      if (entry.anchorTop <= referenceTop) activeId = entry.id;
    });
    return activeId;
  }

  function getCachedAnchorEntries(state, scrollTarget) {
    const cache = state.anchorGeometryCache;
    if (cache && cache.groups === state.groups && cache.scrollTarget === scrollTarget && cache.scrollHeight === scrollTarget.scrollHeight) {
      return cache.entries || [];
    }

    const sortedGroups = (state.groups || []).slice().sort(function(left, right) {
      return (left.index || 0) - (right.index || 0);
    });
    const entries = sortedGroups.map(function(group) {
      const anchor = group.anchorTurn && group.anchorTurn.el;
      const anchorTop = geometry && geometry.getElementTopInScrollContainer
        ? geometry.getElementTopInScrollContainer(anchor, scrollTarget)
        : null;
      return {
        id: group.id,
        index: group.index || 0,
        anchorTop: Number.isFinite(anchorTop) ? anchorTop : null
      };
    });

    state.anchorGeometryCache = {
      groups: state.groups,
      scrollHeight: scrollTarget.scrollHeight,
      scrollTarget: scrollTarget,
      entries: entries
    };
    return entries;
  }

  ns.locator = {
    getMetrics: getMetrics,
    findScrollTarget: findScrollTarget,
    findVisibleDomTurn: findVisibleDomTurn,
    jumpToTurn: jumpToTurn,
    computeActiveGroupId: computeActiveGroupId,
    highlightTurn: highlightTurn
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
