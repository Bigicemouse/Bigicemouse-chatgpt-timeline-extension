(function(root) {
  const ns = root.TLTimelineModules = root.TLTimelineModules || {};

  const CONSTANTS = {
    PANEL_ID: 'tl-chat-timeline',
    STYLE_ID: 'tl-chat-style',
    PREFS_KEY: 'tl-chat-timeline-prefs',
    BOOKMARKS_KEY: 'tl-chat-timeline-bookmarks',
    ACTIVE_TOP_THRESHOLD: 180,
    HIGHLIGHT_DURATION_MS: 1600,
    JUMP_SETTLE_DELAY_MS: 260,
    API_REFRESH_RETRY_MS: 1500,
    API_REFRESH_MAX_ATTEMPTS: 6,
    ROUTE_POLL_MS: 500
  };

  function normalizeText(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
  }

  function truncate(text, maxLength) {
    const normalized = normalizeText(text);
    if (!normalized || normalized.length <= maxLength) return normalized;
    return normalized.slice(0, Math.max(0, maxLength - 3)).trim() + '...';
  }

  function clamp(value, minValue, maxValue) {
    return Math.max(minValue, Math.min(maxValue, value));
  }

  function qs(selector, target) {
    try {
      return (target || root.document).querySelector(selector);
    } catch (error) {
      return null;
    }
  }

  function qsa(selector, target) {
    try {
      return Array.prototype.slice.call((target || root.document).querySelectorAll(selector));
    } catch (error) {
      return [];
    }
  }

  function createElement(tagName, className, text) {
    const element = root.document.createElement(tagName);
    if (className) element.className = className;
    if (typeof text === 'string') element.textContent = text;
    return element;
  }

  function getConversationIdFromUrl(url) {
    const match = String(url || '').match(/\/c\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }

  function isConversationPage(url) {
    return !!getConversationIdFromUrl(url);
  }

  function shouldInitializeConversation(url, hasConversationTurns) {
    return isConversationPage(url) || !!hasConversationTurns;
  }

  function getConversationApiUrls(conversationId) {
    const id = encodeURIComponent(String(conversationId || ''));
    return id ? ['/backend-api/conversation/' + id, '/backend-api/f/conversation/' + id] : [];
  }

  function buildQaGroups(turns) {
    const groups = [];
    let current = null;
    const orderedTurns = (turns || []).slice().sort(function(left, right) {
      return (left.sortIndex || left.order || 0) - (right.sortIndex || right.order || 0);
    });

    orderedTurns.forEach(function(turn) {
      if (turn.role === 'u') {
        if (current) groups.push(finalizeGroup(current, groups.length));
        current = {
          userTurn: turn,
          assistantTurns: [],
          turns: [turn],
          anchorTurn: turn,
          summary: '',
          assistantSummary: '',
          searchText: ''
        };
        return;
      }

      if (!current) {
        current = {
          userTurn: null,
          assistantTurns: [],
          turns: [],
          anchorTurn: turn,
          summary: '',
          assistantSummary: '',
          searchText: ''
        };
      }

      current.assistantTurns.push(turn);
      current.turns.push(turn);
    });

    if (current) groups.push(finalizeGroup(current, groups.length));
    return groups;
  }

  function finalizeGroup(group, index) {
    const userSummary = group.userTurn ? truncate(group.userTurn.text, 84) : '';
    const assistantSummary = group.assistantTurns.length ? truncate(group.assistantTurns[0].text, 110) : '';

    group.index = index;
    group.id = 'qa-group-' + (index + 1);
    group.anchorTurn = group.userTurn || group.turns[0];
    group.summary = userSummary || assistantSummary || ('Conversation block ' + (index + 1));
    group.assistantSummary = assistantSummary;
    group.searchText = normalizeText(group.turns.map(function(turn) {
      return turn.text;
    }).join(' ')).toLowerCase();
    return group;
  }

  function buildRailTimelineItems(groups, activeGroupId) {
    const allGroups = Array.isArray(groups) ? groups.slice().sort(function(left, right) {
      return (left.index || 0) - (right.index || 0);
    }) : [];
    return {
      items: allGroups.map(function(group) {
        return {
          id: group.id,
          index: group.index,
          title: truncate(group.summary || group.assistantSummary || ('Turn ' + (group.index + 1)), 34),
          active: group.id === activeGroupId,
          group: group
        };
      }),
      beforeHidden: false,
      afterHidden: false
    };
  }

  function getTurnTextKey(turn) {
    if (!turn || !turn.text) return '';
    return turn.role + ':' + normalizeText(turn.text).toLowerCase().slice(0, 220);
  }

  function mergeTurnsById(previousTurns, nextTurns) {
    const byKey = {};
    const merged = [];
    let order = 0;

    function keyFor(turn) {
      return (turn && (turn.apiMessageId || turn.id || getTurnTextKey(turn))) || '';
    }

    (previousTurns || []).forEach(function(turn) {
      const key = keyFor(turn);
      if (!key) return;
      order += 1;
      byKey[key] = Object.assign({}, turn, {
        cacheOrder: typeof turn.cacheOrder === 'number' ? turn.cacheOrder : order,
        seenInCurrentDom: false
      });
    });

    (nextTurns || []).forEach(function(turn) {
      const key = keyFor(turn);
      const existing = key ? byKey[key] : null;
      if (!key) return;
      order += 1;
      byKey[key] = Object.assign({}, existing || {}, turn, {
        cacheOrder: existing && typeof existing.cacheOrder === 'number' ? existing.cacheOrder : order,
        seenInCurrentDom: turn.seenInCurrentDom === true
      });
    });

    Object.keys(byKey).forEach(function(key) {
      merged.push(byKey[key]);
    });
    merged.sort(function(left, right) {
      return left.sortIndex - right.sortIndex || left.cacheOrder - right.cacheOrder;
    });
    merged.forEach(function(turn, index) {
      turn.order = index + 1;
    });
    return merged;
  }

  function buildConversationSignature(turns) {
    return (turns || []).map(function(turn) {
      return [turn.id, turn.role, turn.sortIndex, turn.seenInCurrentDom ? '1' : '0', turn.text].join(':');
    }).join('|');
  }

  ns.utils = {
    CONSTANTS: CONSTANTS,
    normalizeText: normalizeText,
    truncate: truncate,
    clamp: clamp,
    qs: qs,
    qsa: qsa,
    createElement: createElement,
    getConversationIdFromUrl: getConversationIdFromUrl,
    isConversationPage: isConversationPage,
    shouldInitializeConversation: shouldInitializeConversation,
    getConversationApiUrls: getConversationApiUrls,
    buildQaGroups: buildQaGroups,
    buildRailTimelineItems: buildRailTimelineItems,
    getTurnTextKey: getTurnTextKey,
    mergeTurnsById: mergeTurnsById,
    buildConversationSignature: buildConversationSignature
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
