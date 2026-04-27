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

  function findVisibleDomTurn(turn) {
    let match = null;
    domCollector.collectTurns().forEach(function(domTurn) {
      const sameId = turn.apiMessageId && domTurn.apiMessageId && turn.apiMessageId === domTurn.apiMessageId;
      const sameText = utils.getTurnTextKey(turn) && utils.getTurnTextKey(turn) === utils.getTurnTextKey(domTurn);
      if (!match && (sameId || sameText)) match = domTurn;
    });
    return match;
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
    domTurn.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    highlightTurn(state, domTurn.el);
    return true;
  }

  function locateTurnAfterEstimatedScroll(state, turn) {
    const match = findVisibleDomTurn(turn);
    scrollVisibleTurnIntoView(state, turn, match);
  }

  function jumpToTurn(state, turn) {
    const visibleMatch = findVisibleDomTurn(turn);
    const target = findScrollTarget();
    const metrics = getMetrics(target);
    const totalTurns = Math.max(state.turns.length, turn.sortIndex || 1, 1);
    const ratio = totalTurns > 1 ? (Math.max(1, turn.sortIndex || 1) - 1) / (totalTurns - 1) : 0;
    const estimatedTop = utils.clamp(Math.round(metrics.maxTop * ratio - metrics.clientHeight * 0.28), 0, metrics.maxTop);

    if (scrollVisibleTurnIntoView(state, turn, visibleMatch)) return;
    if (!target) return;
    target.scrollTop = estimatedTop;
    if (state.locateTimer) root.clearTimeout(state.locateTimer);
    state.locateTimer = root.setTimeout(function() {
      state.locateTimer = null;
      locateTurnAfterEstimatedScroll(state, turn);
    }, CONSTANTS.JUMP_SETTLE_DELAY_MS);
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

  function buildGroupSignature(groups) {
    return (groups || []).map(function(group) {
      const anchor = group && group.anchorTurn;
      return [group && group.id, group && group.index, anchor && anchor.id, anchor && anchor.sortIndex].join(':');
    }).join('|');
  }

  function getCachedAnchorEntries(state, scrollTarget) {
    const signature = buildGroupSignature(state.groups);
    const cache = state.anchorGeometryCache;
    if (cache && cache.signature === signature && cache.scrollTarget === scrollTarget) {
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
      signature: signature,
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
