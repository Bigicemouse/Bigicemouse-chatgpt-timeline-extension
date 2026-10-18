(function(root) {
  const ns = root.TLTimelineModules = root.TLTimelineModules || {};
  const utils = ns.utils;
  const TURN_SELECTORS = [
    '[data-chatgpt-search-unit-key][data-chatgpt-search-message-ids]',
    '[data-testid^="conversation-turn"]',
    'article[data-message-author-role]',
    'section[data-message-author-role]',
    '[data-message-author-role="user"]',
    '[data-message-author-role="assistant"]'
  ];
  const INJECTED_UI_SELECTOR = '#tl-chat-timeline,.tl-card,.tl-marker-rail,.tl-timeline-marker,.tl-row-marker,.tl-card-status,.tl-card-top-hit';
  const HIDDEN_SELECTOR = '[aria-hidden="true"],.visually-hidden,.sr-only,[hidden]';
  const textCache = new WeakMap();

  function invalidateTextCache(mutations) {
    const invalidated = new Set();
    (mutations || []).forEach(function(mutation) {
      let node = mutation.target;
      if (node && node.nodeType !== 1) node = node.parentElement;
      while (node && !invalidated.has(node)) {
        invalidated.add(node);
        textCache.delete(node);
        node = node.parentElement;
      }
    });
  }

  function getConversationRoot() {
    const roots = utils.qsa('[data-app-action-timeline-scroll]');
    return roots.find(function(node) {
      return node.getClientRects().length > 0 && (!node.checkVisibility || node.checkVisibility({ checkVisibilityCSS: true }));
    }) || root.document;
  }

  function getTurnTestId(section) {
    return utils.normalizeText(section && section.getAttribute && section.getAttribute('data-testid'));
  }

  function getDomMessageId(section) {
    const ids = section && section.getAttribute && section.getAttribute('data-chatgpt-search-message-ids');
    if (ids) return utils.normalizeText(ids).split(' ')[0];
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
    const unitKey = section && section.getAttribute && section.getAttribute('data-chatgpt-search-unit-key');
    const unitMatch = String(unitKey || '').match(/^fallback-turn-(\d+):(\d+):(user|assistant)$/);
    if (unitMatch) return Number(unitMatch[1]) * 100 + Number(unitMatch[2]) + 1;
    const match = getTurnTestId(section).match(/conversation-turn-(\d+)/);
    const parsed = match ? parseInt(match[1], 10) : NaN;
    return Number.isNaN(parsed) ? fallbackIndex : parsed;
  }

  function detectRole(section) {
    const unitKey = section && section.getAttribute && section.getAttribute('data-chatgpt-search-unit-key');
    if (/:user$/.test(unitKey || '')) return 'u';
    if (/:assistant$/.test(unitKey || '')) return 'a';
    const explicitUser = selfOrQuery(section, '[data-message-author-role="user"]');
    const explicitAssistant = selfOrQuery(section, '[data-message-author-role="assistant"]');
    if (explicitUser && !explicitAssistant) return 'u';
    if (explicitAssistant && !explicitUser) return 'a';
    return '';
  }

  function extractCleanText(element) {
    if (!element) return '';
    if (!element.nodeType || !root.document.createTreeWalker) return utils.normalizeText(element.textContent);
    try {
      const noise = HIDDEN_SELECTOR + ',' + INJECTED_UI_SELECTOR;
      if (matches(element, noise)) return '';
      // Read text without cloning long answers, SVGs, or interactive widgets.
      const walker = root.document.createTreeWalker(element, 5, {
        acceptNode: function(node) {
          if (node.nodeType === 3) return 1;
          return matches(node, noise) ? 2 : 3;
        }
      });
      const parts = [];
      let node;
      while ((node = walker.nextNode())) parts.push(node.nodeValue);
      return utils.normalizeText(parts.join(''));
    } catch (error) {
      return utils.normalizeText(element.textContent);
    }
  }

  function extractTurnText(section, role) {
    const selectors = role === 'u'
      ? ['[data-user-message-bubble]', '[data-message-author-role="user"] .whitespace-pre-wrap', '[data-message-author-role="user"]', '.whitespace-pre-wrap']
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
    const turn = selfOrClosest(node, '[data-chatgpt-search-unit-key][data-chatgpt-search-message-ids]') ||
      selfOrClosest(node, '[data-testid^="conversation-turn"]') ||
      selfOrClosest(node, 'article[data-message-author-role]') ||
      selfOrClosest(node, 'section[data-message-author-role]') ||
      selfOrClosest(node, '[data-message-author-role]');
    return turn || node;
  }

  function filterTopLevel(sections) {
    const list = (sections || []).filter(Boolean);
    return list.filter(function(section) {
      return !isNestedConversationTurn(section);
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
    const searchRoot = target || getConversationRoot();
    const seen = new Set();
    utils.qsa(TURN_SELECTORS.join(','), searchRoot).forEach(function(node) {
      const section = normalizeTurnSection(node);
      if (section) seen.add(section);
    });
    return filterTopLevel(Array.from(seen));
  }

  function collectTurnsFromSections(sections) {
    const turns = [];
    const seen = {};
    const hasOnlyExplicitTurnIndexes = (sections || []).every(function(section) {
      return /conversation-turn-\d+/.test(getTurnTestId(section)) ||
        /^fallback-turn-\d+:\d+:(user|assistant)$/.test(section.getAttribute && section.getAttribute('data-chatgpt-search-unit-key') || '');
    });
    (sections || []).forEach(function(section, index) {
      const role = detectRole(section);
      if (!role) return;
      let text = textCache.get(section);
      if (text === undefined) {
        text = extractTurnText(section, role);
        textCache.set(section, text);
      }
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

  function findTurnElement(turn) {
    if (!turn) return null;
    const id = turn.apiMessageId;
    if (!id) return null;
    const cached = turn.el;
    if (cached && cached.isConnected && getDomMessageId(cached) === id && detectRole(cached) === turn.role &&
        !cached.closest('[hidden],[inert],[aria-hidden="true"]')) return cached;
    const escaped = root.CSS && root.CSS.escape ? root.CSS.escape(id) : String(id).replace(/["\\]/g, '\\$&');
    const node = utils.qs('[data-chatgpt-search-message-ids~="' + escaped + '"], [data-message-id="' + escaped + '"]', getConversationRoot());
    if (!node) return null;
    const section = normalizeTurnSection(node);
    if (detectRole(section) !== turn.role) return null;
    return section;
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
    const byText = new Map();
    const byMessageId = new Map();
    const byId = new Map();
    const textCounts = new Map();
    const used = new Set();

    (sourceTurns || []).forEach(function(turn) {
      const key = utils.getTurnTextKey(turn);
      textCounts.set(key, (textCounts.get(key) || 0) + 1);
    });

    (domTurns || []).forEach(function(turn) {
      const key = utils.getTurnTextKey(turn);
      if (key) byText.set(key, byText.has(key) ? null : turn);
      if (turn.apiMessageId) byMessageId.set(turn.apiMessageId, turn);
      if (turn.id) byId.set(turn.id, turn);
    });

    // Reserve exact identities before attempting a unique full-text fallback.
    const matches = (sourceTurns || []).map(function(turn) {
      const match = (turn.apiMessageId && byMessageId.get(turn.apiMessageId)) || byId.get(turn.id);
      if (!match || used.has(match) || match.role !== turn.role ||
          (turn.apiMessageId && match.apiMessageId && turn.apiMessageId !== match.apiMessageId)) return null;
      used.add(match);
      return match;
    });
    return (sourceTurns || []).map(function(turn, index) {
      const key = utils.getTurnTextKey(turn);
      let domTurn = matches[index];
      const candidate = textCounts.get(key) === 1 && byText.get(key);
      if (!domTurn && candidate && !used.has(candidate) &&
          !(turn.apiMessageId && candidate.apiMessageId && turn.apiMessageId !== candidate.apiMessageId)) {
        domTurn = candidate;
        used.add(candidate);
      }
      if (!domTurn) return Object.assign({}, turn, { seenInCurrentDom: false, el: null });
      return Object.assign({}, turn, {
        domTurnId: domTurn.id,
        el: domTurn.el,
        seenInCurrentDom: true
      });
    });
  }

  ns.domCollector = {
    invalidateTextCache: invalidateTextCache,
    getConversationRoot: getConversationRoot,
    findTurnElement: findTurnElement,
    collectTurnSections: collectTurnSections,
    collectTurnsFromSections: collectTurnsFromSections,
    collectTurns: collectTurns,
    cacheDomTurns: cacheDomTurns,
    attachDomElementsToTurns: attachDomElementsToTurns
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
