(function(root) {
  const ns = root.TLTimelineModules = root.TLTimelineModules || {};
  const utils = ns.utils;
  const auth = ns.auth;
  const TOOL_CONTENT_TYPES = {
    code: true,
    execution_output: true,
    tether_browsing_display: true,
    tether_quote: true,
    system_error: true,
    model_editable_context: true
  };

  function normalizeMessageRole(role) {
    if (role === 'user') return 'u';
    if (role === 'assistant') return 'a';
    return '';
  }

  function extractTextFromContentPart(part) {
    if (typeof part === 'string') return part;
    if (Array.isArray(part)) return part.map(extractTextFromContentPart).filter(Boolean).join('\n');
    if (!part || typeof part !== 'object') return '';
    if (part.content_type === 'image_asset_pointer') return summarizeImagePart(part);
    if (Array.isArray(part.parts)) {
      return utils.normalizeText(part.parts.map(extractTextFromContentPart).filter(Boolean).join('\n'));
    }
    return utils.normalizeText(part.text || part.transcript || part.name || part.alt_text || part.content || '');
  }

  function summarizeImagePart(part) {
    const metadata = part.metadata || {};
    const title = metadata.dalle && metadata.dalle.prompt ||
      metadata.generation && (metadata.generation.serialization_title || metadata.generation.prompt) ||
      metadata.image_gen_title ||
      part.title ||
      part.name ||
      'image';
    const width = part.width || metadata.container_pixel_width;
    const height = part.height || metadata.container_pixel_height;
    const size = width && height ? ' (' + width + 'x' + height + ')' : '';
    return '[Image: ' + utils.normalizeText(title) + size + ']';
  }

  function extractTextFromMessageContent(content) {
    if (!content) return '';
    if (typeof content === 'string') return utils.normalizeText(content);
    if (Array.isArray(content.parts)) {
      return utils.normalizeText(content.parts.map(extractTextFromContentPart).filter(Boolean).join('\n'));
    }
    return utils.normalizeText(content.text || content.result || '');
  }

  function isToolLikeContent(content) {
    return !!(content && typeof content === 'object' && TOOL_CONTENT_TYPES[content.content_type]);
  }

  function buildConversationPathIds(data) {
    const mapping = data && data.mapping;
    const path = [];
    let currentId = data && data.current_node;
    let guard = 0;

    if (!mapping || typeof mapping !== 'object') return path;
    if (!currentId) {
      Object.keys(mapping).forEach(function(id) {
        const node = mapping[id];
        if (node && (!node.children || !node.children.length)) currentId = id;
      });
    }

    while (currentId && mapping[currentId] && guard < 10000) {
      path.push(currentId);
      currentId = mapping[currentId].parent;
      guard += 1;
    }
    return path.reverse();
  }

  function getMessageTime(node, message) {
    const candidates = [
      message && message.create_time,
      message && message.update_time,
      node && node.create_time,
      node && node.update_time
    ];
    for (let index = 0; index < candidates.length; index += 1) {
      const value = Number(candidates[index]);
      if (Number.isFinite(value) && value > 0) return value;
    }
    return 0;
  }

  function buildTraversalOrder(mapping) {
    const orderById = {};
    const keys = Object.keys(mapping || {});
    let order = 0;

    function visit(nodeId) {
      const node = mapping[nodeId];
      if (!node || orderById[nodeId]) return;
      order += 1;
      orderById[nodeId] = order;
      (node.children || []).forEach(visit);
    }

    keys.filter(function(nodeId) {
      const node = mapping[nodeId];
      return node && !node.parent;
    }).forEach(visit);
    keys.forEach(visit);
    return orderById;
  }

  function hasReadableAssistantDescendant(mapping, nodeId) {
    const stack = ((mapping[nodeId] && mapping[nodeId].children) || []).slice();
    const visited = {};

    while (stack.length) {
      const nextId = stack.shift();
      const node = mapping[nextId];
      const message = node && node.message;
      const role = message && message.author && message.author.role;
      if (!node || visited[nextId]) continue;
      visited[nextId] = true;
      if (role === 'user') continue;
      if (role === 'assistant' && extractTextFromMessageContent(message.content)) return true;
      Array.prototype.push.apply(stack, node.children || []);
    }
    return false;
  }

  function hasReadableConversationDescendant(mapping, nodeId) {
    const stack = ((mapping[nodeId] && mapping[nodeId].children) || []).slice();
    const visited = {};

    while (stack.length) {
      const nextId = stack.shift();
      const node = mapping[nextId];
      const message = node && node.message;
      const role = message && message.author && message.author.role;
      if (!node || visited[nextId]) continue;
      visited[nextId] = true;
      if ((role === 'user' || role === 'assistant') && extractTextFromMessageContent(message.content)) return true;
      Array.prototype.push.apply(stack, node.children || []);
    }
    return false;
  }

  function shouldKeepMessage(nodeId, node, mapping) {
    const message = node && node.message;
    const role = message && message.author && message.author.role;
    const text = extractTextFromMessageContent(message && message.content);
    if (!role || !text) return false;
    if (role === 'user') return true;
    if (role !== 'assistant') return false;
    if (!isToolLikeContent(message.content)) return true;
    return !(mapping && (hasReadableAssistantDescendant(mapping, nodeId) || hasReadableConversationDescendant(mapping, nodeId)));
  }

  function createApiTurn(nodeId, node, orderHint, mapping) {
    const message = node && node.message;
    const role = normalizeMessageRole(message && message.author && message.author.role);
    const text = extractTextFromMessageContent(message && message.content);
    if (!role || !shouldKeepMessage(nodeId, node, mapping)) return null;

    return {
      id: (message && message.id) || nodeId,
      apiMessageId: (message && message.id) || nodeId,
      nodeId: nodeId,
      order: orderHint,
      sortIndex: orderHint,
      createTime: getMessageTime(node, message),
      role: role,
      label: role === 'u' ? 'You' : 'ChatGPT',
      text: text,
      summary: utils.truncate(text, role === 'u' ? 88 : 110),
      searchText: text.toLowerCase(),
      source: 'api',
      el: null,
      seenInCurrentDom: false
    };
  }

  function collectTurnsFromPath(data) {
    const mapping = data && data.mapping;
    const pathIds = buildConversationPathIds(data);
    const turns = [];

    if (!mapping || !pathIds.length) return [];
    pathIds.forEach(function(nodeId) {
      const node = mapping[nodeId];
      const turn = createApiTurn(nodeId, node, turns.length + 1, mapping);
      if (turn) turns.push(turn);
    });
    return turns;
  }

  function collectTurnsFromMapping(data) {
    const mapping = data && data.mapping;
    const orderById = buildTraversalOrder(mapping);
    const byKey = {};
    const turns = [];

    if (!mapping) return [];
    Object.keys(mapping).forEach(function(nodeId) {
      const turn = createApiTurn(nodeId, mapping[nodeId], orderById[nodeId] || 0, mapping);
      const key = turn && (turn.apiMessageId || turn.nodeId);
      if (!turn || !key || byKey[key]) return;
      byKey[key] = true;
      turns.push(turn);
    });

    turns.sort(function(left, right) {
      const leftTime = left.createTime || 0;
      const rightTime = right.createTime || 0;
      if (leftTime && rightTime && leftTime !== rightTime) return leftTime - rightTime;
      if (leftTime !== rightTime) return leftTime ? -1 : 1;
      return (left.order || 0) - (right.order || 0);
    });
    return normalizeTurnOrder(turns);
  }

  function hasReadableDescendant(mapping, nodeId) {
    const stack = ((mapping[nodeId] && mapping[nodeId].children) || []).slice();
    const visited = {};

    while (stack.length) {
      const nextId = stack.shift();
      const node = mapping[nextId];
      if (!node || visited[nextId]) continue;
      visited[nextId] = true;
      if (createApiTurn(nextId, node, 0, mapping)) return true;
      Array.prototype.push.apply(stack, node.children || []);
    }
    return false;
  }

  function shouldUseMappingFallback(data, pathTurns, allTurns) {
    const mapping = data && data.mapping;
    const pathIds = buildConversationPathIds(data);
    const currentId = pathIds[pathIds.length - 1];

    if (!allTurns.length) return false;
    if (!pathTurns.length) return true;
    if (allTurns.length <= pathTurns.length) return false;
    if (!data || !data.current_node) return true;
    return !!(mapping && currentId && hasReadableDescendant(mapping, currentId));
  }

  function normalizeTurnOrder(turns) {
    return (turns || []).map(function(turn, index) {
      const order = index + 1;
      return Object.assign({}, turn, {
        order: order,
        sortIndex: order,
        summary: utils.truncate(turn.text, turn.role === 'u' ? 88 : 110),
        searchText: String(turn.text || '').toLowerCase()
      });
    });
  }

  function collectTurnsFromConversationData(data) {
    return collectTurnsWithMetadata(data).turns;
  }

  function buildMetadata(data, pathTurns, mappingTurns, usedFallback) {
    let reason = 'selected-path';
    if (!data || !data.mapping) {
      reason = 'missing-mapping';
    } else if (!pathTurns.length && mappingTurns.length) {
      reason = 'empty-selected-path';
    } else if (!data.current_node && mappingTurns.length > pathTurns.length) {
      reason = 'missing-current-node';
    } else if (usedFallback) {
      reason = 'selected-path-incomplete';
    }

    return {
      pathTurnCount: pathTurns.length,
      allReadableMappingTurnCount: mappingTurns.length,
      usedFallback: !!usedFallback,
      apiCompleteLikely: !!pathTurns.length && !usedFallback,
      reason: reason
    };
  }

  function collectTurnsWithMetadata(data) {
    const pathTurns = normalizeTurnOrder(collectTurnsFromPath(data));
    const mappingTurns = collectTurnsFromMapping(data);
    const usedFallback = shouldUseMappingFallback(data, pathTurns, mappingTurns);
    const turns = usedFallback ? mappingTurns : pathTurns;
    return {
      turns: turns,
      metadata: buildMetadata(data, pathTurns, mappingTurns, usedFallback)
    };
  }

  function fetchConversationJson(conversationId) {
    const urls = utils.getConversationApiUrls(conversationId);
    let index = 0;

    function tryNext() {
      const url = urls[index];
      if (!url) return Promise.reject(new Error('No readable conversation API endpoint'));
      index += 1;
      return fetchUrl(url, false).catch(function() {
        return tryNext();
      });
    }

    function getHeaders() {
      if (auth && auth.buildAuthHeaders) return auth.buildAuthHeaders();
      return Promise.resolve({ accept: 'application/json' });
    }

    function clearStoredAuth() {
      if (auth && auth.clearAuthCache) return auth.clearAuthCache(true);
      return Promise.resolve();
    }

    function fetchUrl(url, retriedAfterAuthClear) {
      return getHeaders().then(function(headers) {
        return root.fetch(url, {
          credentials: 'include',
          headers: Object.assign({ accept: 'application/json' }, headers || {})
        });
      }).then(function(response) {
        if (response && response.ok) return response.json();
        if (response && response.status === 401 && !retriedAfterAuthClear) {
          return clearStoredAuth().then(function() {
            return fetchUrl(url, true);
          });
        }
        return Promise.reject(new Error('Conversation API returned HTTP ' + (response && response.status || 0)));
      });
    }

    return tryNext();
  }

  ns.conversationApi = {
    collectTurnsFromConversationData: collectTurnsFromConversationData,
    collectTurnsWithMetadata: collectTurnsWithMetadata,
    fetchConversationJson: fetchConversationJson
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
