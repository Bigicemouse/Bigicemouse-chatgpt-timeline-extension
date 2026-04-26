(function(root) {
  const ns = root.TLTimelineModules = root.TLTimelineModules || {};
  const utils = ns.utils;
  const TURN_SELECTORS = [
    '[data-testid^="conversation-turn"]',
    'article[data-message-author-role]',
    'section[data-message-author-role]',
    '[data-message-author-role="user"]',
    '[data-message-author-role="assistant"]'
  ];
  const INJECTED_UI_SELECTOR = '#tl-chat-timeline,.tl-card,.tl-marker-rail,.tl-timeline-marker,.tl-row-marker,.tl-card-status,.tl-card-top-hit';
  const HIDDEN_SELECTOR = '[aria-hidden="true"],.visually-hidden,.sr-only,[hidden]';

  function getTurnTestId(section) {
    return utils.normalizeText(section && section.getAttribute && section.getAttribute('data-testid'));
  }

  function getDomMessageId(section) {
    const direct = section && section.getAttribute && section.getAttribute('data-message-id');
    const nested = utils.qs('[data-message-id]', section);
    return utils.normalizeText(direct || (nested && nested.getAttribute && nested.getAttribute('data-message-id')));
  }

  function stableHash(text) {
    let hash = 2166136261;
    const input = String(text || '');
    for (let index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return (hash >>> 0).toString(36);
  }

  function matches(section, selector) {
    try {
      return !!(section && section.matches && section.matches(selector));
    } catch (error) {
      return false;
    }
  }

  function selfOrClosest(section, selector) {
    if (matches(section, selector)) return section;
    try {
      return section && section.closest && section.closest(selector);
    } catch (error) {
      return null;
    }
  }

  function selfOrQuery(section, selector) {
    if (matches(section, selector)) return section;
    return utils.qs(selector, section);
  }

  function getTurnSortIndex(section, fallbackIndex) {
    const match = getTurnTestId(section).match(/conversation-turn-(\d+)/);
    const parsed = match ? parseInt(match[1], 10) : NaN;
    return Number.isNaN(parsed) ? fallbackIndex : parsed;
  }

  function detectRole(section, index) {
    const explicitUser = selfOrQuery(section, '[data-message-author-role="user"]');
    const explicitAssistant = selfOrQuery(section, '[data-message-author-role="assistant"]');
    if (explicitUser && !explicitAssistant) return 'u';
    if (explicitAssistant && !explicitUser) return 'a';
    return getTurnSortIndex(section, index + 1) % 2 === 1 ? 'u' : 'a';
  }

  function removeNoiseNodes(clone) {
    if (!clone || !clone.querySelectorAll) return clone;
    utils.qsa(HIDDEN_SELECTOR + ',' + INJECTED_UI_SELECTOR, clone).forEach(function(node) {
      if (node && node.remove) node.remove();
    });
    return clone;
  }

  function extractCleanText(element) {
    if (!element) return '';
    if (!element.cloneNode) return utils.normalizeText(element.textContent);
    try {
      const clone = element.cloneNode(true);
      if (matches(clone, HIDDEN_SELECTOR)) return '';
      removeNoiseNodes(clone);
      return utils.normalizeText(clone.textContent);
    } catch (error) {
      return utils.normalizeText(element.textContent);
    }
  }

  function extractTurnText(section, role) {
    const selectors = role === 'u'
      ? ['[data-message-author-role="user"] .whitespace-pre-wrap', '[data-message-author-role="user"]', '.whitespace-pre-wrap']
      : ['[data-message-author-role="assistant"] .markdown', '[data-message-author-role="assistant"] .prose', '[data-message-author-role="assistant"]', '.markdown', '.prose'];
    let text = '';

    selectors.some(function(selector) {
      const element = selfOrQuery(section, selector);
      text = extractCleanText(element);
      return !!text;
    });
    return text || extractCleanText(section);
  }

  function isNestedConversationTurn(section) {
    const parent = section && section.parentElement;
    return !!(parent && parent.closest && parent.closest(TURN_SELECTORS.join(',')));
  }

  function normalizeTurnSection(node) {
    const turn = selfOrClosest(node, '[data-testid^="conversation-turn"]') ||
      selfOrClosest(node, 'article[data-message-author-role]') ||
      selfOrClosest(node, 'section[data-message-author-role]') ||
      selfOrClosest(node, '[data-message-author-role]');
    return turn || node;
  }

  function filterTopLevel(sections) {
    const list = (sections || []).filter(Boolean);
    return list.filter(function(section, index) {
      if (isNestedConversationTurn(section)) return false;
      return !list.some(function(other, otherIndex) {
        return otherIndex !== index && other && other.contains && other.contains(section);
      });
    });
  }

  function getSectionOffset(section, fallbackIndex) {
    const value = Number(section && section.offsetTop);
    return Number.isFinite(value) ? value : fallbackIndex;
  }

  function getStableDomTurnId(section, role, text, index) {
    return getTurnTestId(section) || getDomMessageId(section) || ('dom-' + role + '-' + stableHash(text + '|' + index));
  }

  function collectTurnSections(target) {
    const searchRoot = target || root.document;
    const seen = [];
    TURN_SELECTORS.forEach(function(selector) {
      utils.qsa(selector, searchRoot).forEach(function(node) {
        const section = normalizeTurnSection(node);
        if (section && seen.indexOf(section) === -1) seen.push(section);
      });
    });
    return filterTopLevel(seen);
  }

  function collectTurnsFromSections(sections) {
    const turns = [];
    const seen = {};
    const hasOnlyExplicitTurnIndexes = (sections || []).every(function(section) {
      return /conversation-turn-\d+/.test(getTurnTestId(section));
    });
    (sections || []).forEach(function(section, index) {
      const role = detectRole(section, index);
      const text = extractTurnText(section, role);
      const sortIndex = hasOnlyExplicitTurnIndexes ? getTurnSortIndex(section, index + 1) : index + 1;
      const domTurnId = getStableDomTurnId(section, role, text, index + 1);
      const dedupeKey = [role, text.toLowerCase(), Math.round(getSectionOffset(section, index + 1))].join('|');
      if (!text) return;
      if (seen[dedupeKey]) return;
      seen[dedupeKey] = true;

      turns.push({
        id: domTurnId,
        domTurnId: domTurnId,
        apiMessageId: getDomMessageId(section),
        order: index + 1,
        sortIndex: sortIndex,
        role: role,
        label: role === 'u' ? 'You' : 'ChatGPT',
        text: text,
        summary: utils.truncate(text, role === 'u' ? 88 : 110),
        searchText: text.toLowerCase(),
        source: 'dom',
        el: section,
        seenInCurrentDom: true
      });
    });
    turns.sort(function(left, right) {
      return left.sortIndex - right.sortIndex || left.order - right.order;
    });
    turns.forEach(function(turn, index) {
      turn.order = index + 1;
    });
    return turns;
  }

  function collectTurns() {
    return collectTurnsFromSections(collectTurnSections());
  }

  function detachDomTurn(turn) {
    return Object.assign({}, turn, {
      el: null,
      seenInCurrentDom: false
    });
  }

  function cacheDomTurns(cachedTurns, visibleTurns) {
    return utils.mergeTurnsById(cachedTurns || [], (visibleTurns || []).map(detachDomTurn));
  }

  function attachDomElementsToTurns(sourceTurns, domTurns) {
    const byText = {};
    const byMessageId = {};

    (domTurns || []).forEach(function(turn) {
      const key = utils.getTurnTextKey(turn);
      if (key && !byText[key]) byText[key] = turn;
      if (turn.apiMessageId && !byMessageId[turn.apiMessageId]) byMessageId[turn.apiMessageId] = turn;
    });

    return (sourceTurns || []).map(function(turn) {
      const domTurn = (turn.apiMessageId && byMessageId[turn.apiMessageId]) || byText[utils.getTurnTextKey(turn)];
      if (!domTurn) return Object.assign({}, turn, { seenInCurrentDom: false, el: null });
      return Object.assign({}, turn, {
        domTurnId: domTurn.id,
        el: domTurn.el,
        seenInCurrentDom: true
      });
    });
  }

  ns.domCollector = {
    collectTurnSections: collectTurnSections,
    collectTurnsFromSections: collectTurnsFromSections,
    collectTurns: collectTurns,
    cacheDomTurns: cacheDomTurns,
    attachDomElementsToTurns: attachDomElementsToTurns
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
