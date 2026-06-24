(function(root) {
  const ns = root.TLTimelineModules = root.TLTimelineModules || {};
  const utils = ns.utils;
  const styles = ns.styles;
  const prefs = ns.state;
  const layout = ns.layout;
  const locator = ns.locator;
  const geometry = ns.geometry;
  const virtualList = ns.virtualList;
  const CONSTANTS = utils.CONSTANTS;
  const PREVIEW_ROW_HEIGHT = 42;
  const PREVIEW_VIEWPORT_HEIGHT = 224;
  const PREVIEW_OVERSCAN = 8;
  const PREVIEW_FULL_RENDER_LIMIT = 40;
  const RAIL_MARKER_LIMIT = 5;
  const RAIL_TRACK_PADDING = 8;
  const RAIL_MIN_MARKER_GAP = 20;

  function destroyUI(state) {
    cancelHoverClose(state);
    cancelPreviewFrame(state);
    if (state.ui.panel && state.ui.panel.remove) state.ui.panel.remove();
    state.ui = {};
    if (layout) layout.clearLayout();
    styles.removeStyle();
  }

  function ensureUI(state, actions) {
    if (!root.document || !root.document.body) return;
    styles.ensureStyle();
    if (state.ui.panel && root.document.body.contains(state.ui.panel)) return;

    const panel = utils.createElement('aside');
    panel.id = CONSTANTS.PANEL_ID;
    panel.setAttribute('aria-label', 'Conversation timeline');
    root.document.body.appendChild(panel);
    state.ui.panel = panel;
    render(state, actions);
  }

  function render(state, actions) {
    const panel = state.ui.panel;
    if (!panel) return;

    if (!state.prefs) state.prefs = prefs.getDefaultPrefs();
    if (state.prefs.mode !== 'collapsed') {
      state.prefs.mode = 'collapsed';
      prefs.savePrefs(state);
    }

    state.ui.timelineOpen = false;
    panel.className = 'tl-collapsed' + (state.ui.hoverPreview ? ' tl-previewing' : '');
    panel.setAttribute('aria-expanded', 'false');
    panel.onmouseenter = function() {
      cancelHoverClose(state);
    };
    panel.onmouseleave = function() {
      scheduleHoverClose(state, actions);
    };
    renderCollapsed(panel, state, actions || {});
    if (state.ui.hoverPreview) {
      renderHoverPreview(panel, state, actions || {});
    } else {
      const card = utils.qs('.tl-hover-card', panel);
      if (card) card.remove();
      cancelPreviewFrame(state);
    }
  }

  function cancelPreviewFrame(state) {
    if (!state || !state.ui || !state.ui.previewFrame) return;
    if (root.cancelAnimationFrame) {
      root.cancelAnimationFrame(state.ui.previewFrame);
    } else {
      root.clearTimeout(state.ui.previewFrame);
    }
    state.ui.previewFrame = null;
  }

  function requestFrame(callback) {
    if (root.requestAnimationFrame) return root.requestAnimationFrame(callback);
    return root.setTimeout(callback, 16);
  }

  function cancelHoverClose(state) {
    if (!state || !state.ui || !state.ui.hoverCloseTimer) return;
    root.clearTimeout(state.ui.hoverCloseTimer);
    state.ui.hoverCloseTimer = null;
  }

  function scheduleHoverClose(state, actions) {
    if (!state || !state.ui || !state.ui.hoverPreview) return;
    cancelHoverClose(state);
    state.ui.hoverCloseTimer = root.setTimeout(function() {
      state.ui.hoverCloseTimer = null;
      if (!state.ui.hoverPreview) return;
      state.ui.hoverPreview = false;
      cancelPreviewFrame(state);
      render(state, actions || {});
    }, 180);
  }

  function openHoverPreview(state, actions) {
    if (!state || !state.ui) return;
    cancelHoverClose(state);
    if (state.ui.hoverPreview) return;
    state.ui.hoverPreview = true;
    state.ui.previewAutoScrollKey = '';
    render(state, actions || {});
  }

  function activatePreviewGroup(state, groupId) {
    if (!state || !groupId || state.activeGroupId === groupId) return;
    state.activeGroupId = groupId;
    if (state.ui) state.ui.previewAutoScrollKey = '';
  }

  function setMode(state, mode, actions) {
    state.prefs.mode = 'collapsed';
    prefs.savePrefs(state);
    render(state, actions);
  }

  function getTimelineStatusText(state) {
    const metadata = state && state.apiCompleteness;
    if (state && state.loading) return '正在读取完整对话...';
    if (state && state.error) return 'API 未返回完整对话，页面 DOM 只能读取已渲染内容';
    if (metadata && metadata.usedFallback) return 'API 路径不完整，已读取 mapping 中可读内容';
    if (metadata && metadata.reason === 'api-error') return 'API 未返回完整对话，页面 DOM 只能读取已渲染内容';
    if (state && !state.apiTurns.length && state.domCollectionReady && state.turns.length) {
      return 'API 未返回完整对话，页面 DOM 只能读取已渲染内容';
    }
    return '';
  }

  function renderCollapsed(panel, state, actions) {
    const existingRail = utils.qs('.tl-marker-rail', panel);
    if (existingRail) {
      patchCollapsedRail(existingRail, state, actions);
      return;
    }

    const rail = utils.createElement('nav', 'tl-marker-rail');
    const track = utils.createElement('div', 'tl-marker-track');
    const content = utils.createElement('div', 'tl-marker-track-content');
    const activeId = state.activeGroupId || (state.groups[0] && state.groups[0].id) || '';
    const scrollTarget = state.scrollEl || (locator && locator.findScrollTarget && locator.findScrollTarget());
    const markerGeometry = buildMarkerGeometry(state.groups, activeId, scrollTarget);

    setupRail(rail, state, actions);
    content.style.height = markerGeometry.contentHeight + 'px';
    populateMarkers(content, markerGeometry.items, state, actions);

    track.appendChild(content);
    rail.appendChild(track);
    panel.appendChild(rail);
  }

  function setupRail(rail, state, actions) {
    rail.setAttribute('aria-label', 'Conversation markers');
    rail.onmouseenter = function() {
      openHoverPreview(state, actions);
    };
    rail.onmouseleave = function() {
      scheduleHoverClose(state, actions);
    };
    rail.onclick = function(event) {
      const target = event.target;
      if (target && target.closest && target.closest('.tl-timeline-marker')) return;
      const group = getRailGroupFromClick(state.groups, event, rail);
      if (!group) return;
      event.stopPropagation();
      activatePreviewGroup(state, group.id);
      openHoverPreview(state, actions);
      if (actions.jumpToGroup) actions.jumpToGroup(group);
    };
  }

  function patchCollapsedRail(rail, state, actions) {
    setupRail(rail, state, actions);
    const activeId = state.activeGroupId || (state.groups[0] && state.groups[0].id) || '';
    const scrollTarget = state.scrollEl || (locator && locator.findScrollTarget && locator.findScrollTarget());
    const markerGeometry = buildMarkerGeometry(state.groups, activeId, scrollTarget);
    const content = utils.qs('.tl-marker-track-content', rail);
    const byId = {};

    if (!content) return;
    content.style.height = markerGeometry.contentHeight + 'px';
    markerGeometry.items.forEach(function(item) {
      byId[item.id] = item;
    });
    utils.qsa('.tl-timeline-marker', content).forEach(function(node) {
      const item = byId[node.getAttribute('data-tl-group-id')];
      if (!item) {
        node.remove();
        return;
      }
      applyMarkerNode(node, item, state, actions);
    });
    markerGeometry.items.forEach(function(item) {
      if (!utils.qs('[data-tl-group-id="' + escapeAttributeValue(item.id) + '"]', content)) {
        content.appendChild(createMarkerNode(item, state, actions));
      }
    });
  }

  function populateMarkers(content, items, state, actions) {
    items.forEach(function(item) {
      content.appendChild(createMarkerNode(item, state, actions));
    });
  }

  function createMarkerNode(item, state, actions) {
    const node = utils.createElement('button', 'tl-timeline-marker');
    node.type = 'button';
    applyMarkerNode(node, item, state, actions);
    return node;
  }

  function applyMarkerNode(node, item, state, actions) {
    const label = (item.index + 1) + '/' + state.groups.length + ' ' + item.title;

    node.classList.toggle('tl-marker-active', !!item.active);
    node.classList.toggle('active', !!item.active);
    node.removeAttribute('title');
    node.setAttribute('aria-label', label);
    node.setAttribute('data-tl-label', label);
    node.setAttribute('data-tl-group-id', item.id);
    node.style.top = item.y + 'px';
    node.onclick = function(event) {
      event.stopPropagation();
      activatePreviewGroup(state, item.id);
      openHoverPreview(state, actions);
      if (actions.jumpToGroup) actions.jumpToGroup(item.group);
    };
  }

  function escapeAttributeValue(value) {
    if (root.CSS && root.CSS.escape) return root.CSS.escape(String(value));
    return String(value || '').replace(/["\\]/g, '\\$&');
  }

  function getRailGroupFromClick(groups, event, rail) {
    const orderedGroups = (groups || []).slice().sort(function(left, right) {
      return (left.index || 0) - (right.index || 0);
    });
    if (!orderedGroups.length || !rail || !rail.getBoundingClientRect) return null;

    let rect = null;
    try {
      rect = rail.getBoundingClientRect();
    } catch (error) {
      rect = null;
    }

    const height = Math.max(1, Number(rect && rect.height) || Number(rail.clientHeight) || 1);
    const top = Number(rect && rect.top) || 0;
    const clientY = Number(event && event.clientY);
    const ratio = Number.isFinite(clientY)
      ? utils.clamp((clientY - top) / height, 0, 1)
      : 0;
    const index = utils.clamp(Math.round(ratio * (orderedGroups.length - 1)), 0, orderedGroups.length - 1);
    return orderedGroups[index] || null;
  }

  function buildMarkerGeometry(groups, activeGroupId, scrollTarget) {
    const allItems = utils.buildRailTimelineItems(groups, activeGroupId).items;
    if (!allItems.length) {
      return { contentHeight: 0, items: [] };
    }
    const sampledItems = sampleRailItems(allItems, activeGroupId, RAIL_MARKER_LIMIT);
    const contentHeight = Math.max(
      48,
      RAIL_TRACK_PADDING * 2 + Math.max(0, sampledItems.length - 1) * RAIL_MIN_MARKER_GAP
    );
    const usableHeight = Math.max(1, contentHeight - RAIL_TRACK_PADDING * 2);
    const maxIndex = Math.max(1, allItems.length - 1);

    return {
      contentHeight: contentHeight,
      items: sampledItems.map(function(item) {
        const ratio = utils.clamp((item.index || 0) / maxIndex, 0, 1);
        return Object.assign({}, item, {
          y: Math.round(RAIL_TRACK_PADDING + ratio * usableHeight),
          yRatio: ratio,
          hasDomGeometry: false
        });
      })
    };
  }

  function sampleRailItems(allItems, activeGroupId, limit) {
    const activeIndex = Math.max(0, allItems.findIndex(function(item) { return item.id === activeGroupId; }));
    const byIndex = {};
    const maxIndex = allItems.length - 1;

    function add(index) {
      const normalized = utils.clamp(Math.round(index), 0, maxIndex);
      byIndex[normalized] = true;
    }

    for (let index = 0; index < limit; index += 1) {
      add((maxIndex * index) / Math.max(1, limit - 1));
    }
    for (let index = activeIndex - 2; index <= activeIndex + 2; index += 1) add(index);
    add(0);
    add(maxIndex);

    let indexes = Object.keys(byIndex).map(function(index) { return Number(index); }).sort(function(left, right) {
      return left - right;
    });

    while (indexes.length > limit) {
      let removeAt = -1;
      let farthest = -1;
      indexes.forEach(function(index, position) {
        if (index === 0 || index === maxIndex || Math.abs(index - activeIndex) <= 2) return;
        const distance = Math.abs(index - activeIndex);
        if (distance > farthest) {
          farthest = distance;
          removeAt = position;
        }
      });
      if (removeAt < 0) removeAt = indexes.length - 2;
      indexes.splice(removeAt, 1);
    }

    return indexes.map(function(index) {
      return allItems[index];
    });
  }

  function renderHoverPreview(panel, state, actions) {
    const activeId = state.activeGroupId || (state.groups[0] && state.groups[0].id) || '';
    const previewItems = getFilteredPreviewItems(state, activeId);
    const card = utils.createElement('div', 'tl-hover-card');
    const existingCard = utils.qs('.tl-hover-card', panel);

    if (existingCard) existingCard.remove();

    card.addEventListener('mouseenter', function() {
      cancelHoverClose(state);
    });
    card.addEventListener('mouseleave', function() {
      scheduleHoverClose(state, actions);
    });

    renderPreviewList(card, state, actions, previewItems, activeId);
    panel.appendChild(card);

    const list = utils.qs('.tl-hover-list', card);
    if (list) list.scrollTop = Number(state.ui.previewScrollTop) || 0;
  }

  function getFilteredPreviewItems(state, activeId) {
    return utils.buildRailTimelineItems(state.groups, activeId).items;
  }

  function getPreviewScrollTop(state, items, activeId) {
    const key = [activeId, items.length].join('|');
    const maxScrollTop = Math.max(0, items.length * PREVIEW_ROW_HEIGHT - PREVIEW_VIEWPORT_HEIGHT);

    if (state.ui.previewAutoScrollKey !== key) {
      const activeIndex = items.findIndex(function(item) { return item.id === activeId; });
      state.ui.previewScrollTop = activeIndex >= 0
        ? utils.clamp(Math.round(activeIndex * PREVIEW_ROW_HEIGHT - (PREVIEW_VIEWPORT_HEIGHT - PREVIEW_ROW_HEIGHT) / 2), 0, maxScrollTop)
        : 0;
      state.ui.previewAutoScrollKey = key;
    }

    return utils.clamp(Number(state.ui.previewScrollTop) || 0, 0, maxScrollTop);
  }

  function renderPreviewList(card, state, actions, previewItems, activeId) {
    const list = utils.createElement('div', 'tl-hover-list tl-report-index');
    const spacer = utils.createElement('div', 'tl-hover-list-spacer');
    const windowNode = utils.createElement('div', 'tl-hover-list-window');
    const scrollTop = getPreviewScrollTop(state, previewItems, activeId);
    const windowInfo = buildPreviewWindow(previewItems.length, scrollTop);
    const visibleItems = previewItems.slice(windowInfo.startIndex, windowInfo.endIndex);

    state.ui.previewScrollTop = scrollTop;
    state.ui.virtualWindow = windowInfo;
    list.style.height = Math.min(PREVIEW_VIEWPORT_HEIGHT, Math.max(PREVIEW_ROW_HEIGHT, windowInfo.totalHeight || PREVIEW_ROW_HEIGHT)) + 'px';
    list.style.maxHeight = PREVIEW_VIEWPORT_HEIGHT + 'px';
    list.style.overflowY = 'auto';
    list.setAttribute('role', 'listbox');
    list.addEventListener('scroll', function() {
      state.ui.previewScrollTop = list.scrollTop;
      if (state.ui.previewFrame) return;
      state.ui.previewFrame = requestFrame(function() {
        state.ui.previewFrame = null;
        patchPreviewList(list, state, actions || {}, previewItems, activeId);
      });
    }, { passive: true });

    if (!previewItems.length) {
      const empty = utils.createElement('div', 'tl-empty-state', '没有匹配内容');
      list.appendChild(empty);
      card.appendChild(list);
      return;
    }

    spacer.style.height = windowInfo.totalHeight + 'px';
    windowNode.style.transform = 'translateY(' + windowInfo.offsetTop + 'px)';
    visibleItems.forEach(function(item) {
      windowNode.appendChild(renderPreviewRow(state, actions, item));
    });
    spacer.appendChild(windowNode);
    list.appendChild(spacer);
    card.appendChild(list);
  }

  function patchPreviewList(list, state, actions, previewItems, activeId) {
    if (!list || !previewItems || !previewItems.length) return;
    const spacer = utils.qs('.tl-hover-list-spacer', list);
    const windowNode = utils.qs('.tl-hover-list-window', list);
    const scrollTop = Math.max(0, Number(list.scrollTop) || 0);
    const windowInfo = buildPreviewWindow(previewItems.length, scrollTop);
    const visibleItems = previewItems.slice(windowInfo.startIndex, windowInfo.endIndex);

    state.ui.previewScrollTop = scrollTop;
    state.ui.virtualWindow = windowInfo;
    if (spacer) spacer.style.height = windowInfo.totalHeight + 'px';
    if (!windowNode) return;
    windowNode.style.transform = 'translateY(' + windowInfo.offsetTop + 'px)';
    while (windowNode.firstChild) windowNode.removeChild(windowNode.firstChild);
    visibleItems.forEach(function(item) {
      windowNode.appendChild(renderPreviewRow(state, actions, item));
    });
  }

  function buildPreviewWindow(itemCount, scrollTop) {
    if (itemCount <= PREVIEW_FULL_RENDER_LIMIT || !virtualList || !virtualList.computeVirtualWindow) {
      return {
        startIndex: 0,
        endIndex: itemCount,
        offsetTop: 0,
        totalHeight: itemCount * PREVIEW_ROW_HEIGHT,
        renderedCount: itemCount
      };
    }
    return virtualList.computeVirtualWindow({
      itemCount: itemCount,
      rowHeight: PREVIEW_ROW_HEIGHT,
      viewportHeight: PREVIEW_VIEWPORT_HEIGHT,
      scrollTop: scrollTop,
      overscan: PREVIEW_OVERSCAN
    });
  }

  function renderPreviewRow(state, actions, item) {
    const row = utils.createElement('div', 'tl-hover-row' + (item.active ? ' active' : ''));
    const titleButton = utils.createElement('button', 'tl-hover-title-button');
    const body = utils.createElement('span', 'tl-hover-body');
    const title = utils.createElement('span', 'tl-hover-title', item.title);

    row.setAttribute('aria-label', (item.index + 1) + '/' + state.groups.length + ' ' + item.group.summary);
    row.setAttribute('data-tl-group-id', item.id);
    row.style.height = PREVIEW_ROW_HEIGHT + 'px';
    row.addEventListener('click', function(event) {
      event.stopPropagation();
      if (actions.jumpToGroup) actions.jumpToGroup(item.group);
    });

    titleButton.type = 'button';
    titleButton.addEventListener('click', function(event) {
      event.stopPropagation();
      if (actions.jumpToGroup) actions.jumpToGroup(item.group);
    });
    body.appendChild(title);
    titleButton.appendChild(body);
    row.appendChild(titleButton);
    return row;
  }
  function getCollapsedItems(groups, activeGroupId, maxItems) {
    const all = utils.buildRailTimelineItems(groups, activeGroupId).items;
    const limit = Math.max(1, maxItems || 12);
    let activeIndex = all.findIndex(function(item) { return item.id === activeGroupId; });
    if (activeIndex < 0) activeIndex = 0;
    const start = utils.clamp(activeIndex - Math.floor(limit / 2), 0, Math.max(0, all.length - limit));
    return all.slice(start, start + limit);
  }

  function updateActiveClasses(state) {
    if (!state.ui.panel) return;
    utils.qsa('[data-tl-group-id]', state.ui.panel).forEach(function(node) {
      const active = node.getAttribute('data-tl-group-id') === state.activeGroupId;
      node.classList.toggle('active', active);
      node.classList.toggle('tl-marker-active', active);
    });
  }

  ns.timeline = {
    ensureUI: ensureUI,
    destroyUI: destroyUI,
    render: render,
    setMode: setMode,
    updateActiveClasses: updateActiveClasses,
    getCollapsedItems: getCollapsedItems,
    getTimelineStatusText: getTimelineStatusText
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
