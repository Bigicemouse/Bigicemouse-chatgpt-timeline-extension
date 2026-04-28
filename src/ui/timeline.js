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
  const PREVIEW_ROW_HEIGHT = 52;
  const PREVIEW_VIEWPORT_HEIGHT = 288;
  const PREVIEW_OVERSCAN = 8;
  const PREVIEW_FULL_RENDER_LIMIT = 40;
  const RAIL_MARKER_LIMIT = 120;
  const RAIL_TRACK_PADDING = 16;
  const RAIL_MIN_MARKER_GAP = 16;
  const REPORT_ACCENTS = ['#5f6a63', '#2f6f5e', '#6f7d4f', '#7a6f55', '#4f6f5f'];

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
    node.classList.toggle('tl-marker-active', !!item.active);
    node.classList.toggle('active', !!item.active);
    node.title = (item.index + 1) + '/' + state.groups.length + ' ' + item.title;
    node.setAttribute('aria-label', node.title);
    node.setAttribute('data-tl-group-id', item.id);
    node.style.top = item.y + 'px';
    node.style.setProperty('--tl-accent', getAccentColor(item.index));
    node.onclick = function(event) {
      event.stopPropagation();
      if (actions.jumpToGroup) actions.jumpToGroup(item.group);
    };
  }

  function escapeAttributeValue(value) {
    if (root.CSS && root.CSS.escape) return root.CSS.escape(String(value));
    return String(value || '').replace(/["\\]/g, '\\$&');
  }

  function getAccentColor(index) {
    const normalized = Math.max(0, Number(index) || 0);
    return REPORT_ACCENTS[normalized % REPORT_ACCENTS.length];
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
    if (allItems.length <= RAIL_MARKER_LIMIT && geometry && geometry.buildTimelineGeometry) {
      return geometry.buildTimelineGeometry(groups, activeGroupId, scrollTarget);
    }

    const sampledItems = sampleRailItems(allItems, activeGroupId, RAIL_MARKER_LIMIT);
    const contentHeight = Math.max(
      160,
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

    renderReportHeader(card, state, previewItems);
    ensureSelectedExportGroups(state);
    renderExportToolbar(card, state, actions);
    renderPreviewList(card, state, actions, previewItems, activeId);
    panel.appendChild(card);

    const list = utils.qs('.tl-hover-list', card);
    if (list) list.scrollTop = Number(state.ui.previewScrollTop) || 0;
    restoreSearchFocus(card, state);
  }

  function renderReportHeader(card, state, previewItems) {
    const header = utils.createElement('div', 'tl-report-header');
    const titleWrap = utils.createElement('div', 'tl-report-heading');
    const eyebrow = utils.createElement('div', 'tl-report-eyebrow', 'Conversation Index');
    const title = utils.createElement('div', 'tl-report-title', '对话目录');
    const metaText = (previewItems.length || 0) + '/' + ((state.groups && state.groups.length) || 0) + ' 条';
    const meta = utils.createElement('div', 'tl-report-meta', metaText);

    titleWrap.appendChild(eyebrow);
    titleWrap.appendChild(title);
    header.appendChild(titleWrap);
    header.appendChild(meta);
    card.appendChild(header);
  }

  function getSearchQuery(state) {
    return utils.normalizeText(state && state.ui && state.ui.searchQuery).toLowerCase();
  }

  function getFilteredPreviewItems(state, activeId) {
    const allItems = utils.buildRailTimelineItems(state.groups, activeId).items;
    const query = getSearchQuery(state);
    if (!query) return allItems;
    return allItems.filter(function(item) {
      const group = item.group || {};
      const haystack = [
        item.title,
        group.summary,
        group.assistantSummary,
        group.searchText
      ].join(' ').toLowerCase();
      return haystack.indexOf(query) !== -1;
    });
  }

  function getPreviewScrollTop(state, items, activeId) {
    const query = getSearchQuery(state);
    const key = [activeId, items.length, query].join('|');
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
    const selected = isExportGroupSelected(state, item.group);
    const selectionMode = !!state.ui.selectionMode;
    const row = utils.createElement('div', 'tl-hover-row' +
      (item.active ? ' active' : '') +
      (selected ? '' : ' tl-row-unselected') +
      (selectionMode ? ' tl-selection-mode' : ''));
    const titleButton = utils.createElement('button', 'tl-hover-title-button');
    const index = utils.createElement('span', 'tl-hover-index', String((item.index || 0) + 1).padStart(2, '0'));
    const body = utils.createElement('span', 'tl-hover-body');
    const title = utils.createElement('span', 'tl-hover-title', item.title);
    const summary = utils.createElement('span', 'tl-hover-summary', utils.truncate(item.group && item.group.assistantSummary || item.group && item.group.summary || '', 96));

    row.title = (item.index + 1) + '/' + state.groups.length + ' ' + item.group.summary;
    row.setAttribute('data-tl-group-id', item.id);
    row.style.height = PREVIEW_ROW_HEIGHT + 'px';
    row.style.setProperty('--tl-accent', getAccentColor(item.index));
    row.addEventListener('click', function(event) {
      event.stopPropagation();
      if (actions.jumpToGroup) actions.jumpToGroup(item.group);
    });

    if (selectionMode) {
      const select = utils.createElement('input', 'tl-row-select');
      select.type = 'checkbox';
      select.checked = selected;
      select.setAttribute('aria-label', '选择导出 ' + item.title);
      select.addEventListener('click', function(event) {
        event.stopPropagation();
      });
      select.addEventListener('change', function() {
        setExportGroupSelected(state, item.group, select.checked, select, actions);
      });
      row.appendChild(select);
    }

    titleButton.type = 'button';
    titleButton.addEventListener('click', function(event) {
      event.stopPropagation();
      if (actions.jumpToGroup) actions.jumpToGroup(item.group);
    });
    body.appendChild(title);
    if (summary.textContent && summary.textContent !== title.textContent) body.appendChild(summary);
    titleButton.appendChild(index);
    titleButton.appendChild(body);
    row.appendChild(titleButton);
    return row;
  }

  function getExportOptions(state) {
    if (!state.ui.exportOptions) {
      state.ui.exportOptions = {
        includeUser: true,
        includeAssistant: true
      };
    }
    if (!state.ui.exportOptions.includeUser && !state.ui.exportOptions.includeAssistant) {
      state.ui.exportOptions.includeUser = true;
      state.ui.exportOptions.includeAssistant = true;
    }
    return state.ui.exportOptions;
  }

  function ensureSelectedExportGroups(state) {
    if (!state.ui.exportGroupSelection) state.ui.exportGroupSelection = {};
    const selection = state.ui.exportGroupSelection;
    const known = {};
    (state.groups || []).forEach(function(group) {
      if (!group || !group.id) return;
      known[group.id] = true;
      if (typeof selection[group.id] !== 'boolean') selection[group.id] = true;
    });
    Object.keys(selection).forEach(function(id) {
      if (!known[id]) delete selection[id];
    });
    if ((state.groups || []).length && !getSelectedGroupIds(state).length) {
      selection[state.groups[0].id] = true;
    }
    return selection;
  }

  function getSelectedGroupIds(state) {
    const selection = state.ui.exportGroupSelection || {};
    return (state.groups || []).filter(function(group) {
      return group && group.id && selection[group.id] !== false;
    }).map(function(group) {
      return group.id;
    });
  }

  function isExportGroupSelected(state, group) {
    ensureSelectedExportGroups(state);
    return !!(group && state.ui.exportGroupSelection[group.id] !== false);
  }

  function setExportGroupSelected(state, group, selected, input, actions) {
    if (!group || !group.id) return;
    const selection = ensureSelectedExportGroups(state);
    const selectedIds = getSelectedGroupIds(state);
    if (!selected && selectedIds.length <= 1 && selection[group.id] !== false) {
      if (input) input.checked = true;
      return;
    }
    selection[group.id] = !!selected;
    if (input) {
      input.checked = !!selected;
      const row = input.closest && input.closest('.tl-hover-row');
      if (row && row.classList) row.classList.toggle('tl-row-unselected', !selected);
    }
  }

  function setExportOption(state, key, value, input) {
    const options = getExportOptions(state);
    options[key] = !!value;
    if (!options.includeUser && !options.includeAssistant) {
      options[key] = true;
      if (input) input.checked = true;
    }
  }

  function renderExportToolbar(card, state, actions) {
    const options = getExportOptions(state);
    const toolbar = utils.createElement('div', 'tl-export-toolbar tl-report-toolbar');
    const searchWrap = utils.createElement('div', 'tl-search-wrap');
    const controls = utils.createElement('div', 'tl-toolbar-controls');
    const choices = utils.createElement('div', 'tl-export-choices');
    const buttons = utils.createElement('div', 'tl-export-buttons');

    toolbar.addEventListener('click', function(event) {
      event.stopPropagation();
    });

    searchWrap.appendChild(renderSearchInput(state, actions));
    choices.appendChild(renderExportChoice(state, 'tl-export-user', '我的输入', 'includeUser', options.includeUser));
    choices.appendChild(renderExportChoice(state, 'tl-export-assistant', 'GPT 输出', 'includeAssistant', options.includeAssistant));
    buttons.appendChild(renderSelectionToggle(state, actions));
    buttons.appendChild(renderLayoutControl(state, actions));
    buttons.appendChild(renderExportButton('导出 MD', 'tl-export-md', 'md', state, actions));
    buttons.appendChild(renderExportButton('导出 PDF', 'tl-export-pdf', 'pdf', state, actions));
    controls.appendChild(choices);
    controls.appendChild(buttons);
    toolbar.appendChild(searchWrap);
    toolbar.appendChild(controls);
    card.appendChild(toolbar);
  }

  function renderSearchInput(state, actions) {
    const input = utils.createElement('input', 'tl-search-input');
    input.type = 'search';
    input.value = state.ui.searchQuery || '';
    input.placeholder = '搜索对话';
    input.setAttribute('aria-label', '搜索对话');
    input.addEventListener('click', function(event) {
      event.stopPropagation();
    });
    input.addEventListener('focus', function() {
      state.ui.searchFocus = true;
    });
    input.addEventListener('blur', function() {
      state.ui.searchFocus = false;
    });
    input.addEventListener('input', function() {
      state.ui.searchQuery = input.value;
      state.ui.searchFocus = true;
      state.ui.searchSelectionStart = input.selectionStart;
      state.ui.previewScrollTop = 0;
      state.ui.previewAutoScrollKey = '';
      render(state, actions || {});
    });
    return input;
  }

  function restoreSearchFocus(card, state) {
    const input = state && state.ui && state.ui.searchFocus ? utils.qs('.tl-search-input', card) : null;
    if (!input || !input.focus) return;
    try {
      input.focus();
      if (input.setSelectionRange) {
        const cursor = Number.isFinite(Number(state.ui.searchSelectionStart))
          ? Number(state.ui.searchSelectionStart)
          : String(input.value || '').length;
        input.setSelectionRange(cursor, cursor);
      }
    } catch (error) {
      // Ignore focus failures; the timeline remains usable with mouse navigation.
    }
  }

  function renderSelectionToggle(state, actions) {
    const selectedCount = getSelectedGroupIds(state).length;
    const totalCount = (state.groups || []).length;
    const button = utils.createElement(
      'button',
      'tl-export-button tl-selection-toggle' + (state.ui.selectionMode ? ' active' : ''),
      state.ui.selectionMode ? ('完成 ' + selectedCount + '/' + totalCount) : '选择'
    );
    button.type = 'button';
    button.addEventListener('click', function(event) {
      event.stopPropagation();
      state.ui.selectionMode = !state.ui.selectionMode;
      render(state, actions || {});
    });
    return button;
  }

  function renderExportChoice(state, className, text, key, checked) {
    const label = utils.createElement('label', 'tl-export-choice ' + className);
    const input = utils.createElement('input');
    const caption = utils.createElement('span', '', text);

    input.type = 'checkbox';
    input.checked = !!checked;
    input.addEventListener('click', function(event) {
      event.stopPropagation();
    });
    input.addEventListener('change', function() {
      setExportOption(state, key, input.checked, input);
    });
    label.appendChild(input);
    label.appendChild(caption);
    return label;
  }

  function renderExportButton(text, className, format, state, actions) {
    const button = utils.createElement('button', 'tl-export-button ' + className, text);
    button.type = 'button';
    button.addEventListener('click', function(event) {
      event.stopPropagation();
      if (actions.exportConversation) {
        const options = getExportOptions(state);
        actions.exportConversation(format, {
          includeUser: options.includeUser,
          includeAssistant: options.includeAssistant,
          selectedGroupIds: getSelectedGroupIds(state)
        });
      }
    });
    return button;
  }

  function getLayoutMode(state) {
    return prefs.normalizeLayoutMode(state && state.prefs && state.prefs.layoutMode);
  }

  function renderLayoutControl(state, actions) {
    const wrap = utils.createElement('div', 'tl-layout-control');
    const button = utils.createElement('button', 'tl-export-button tl-layout-button', '宽度');
    const modes = [
      { id: 'default', label: '默认' },
      { id: 'comfortable', label: '舒适' },
      { id: 'wide', label: '宽屏' },
      { id: 'full', label: '全宽' }
    ];

    button.type = 'button';
    button.setAttribute('aria-haspopup', 'menu');
    button.setAttribute('aria-expanded', state.ui.layoutMenuOpen ? 'true' : 'false');
    button.addEventListener('click', function(event) {
      event.stopPropagation();
      state.ui.layoutMenuOpen = !state.ui.layoutMenuOpen;
      render(state, actions || {});
    });
    wrap.appendChild(button);

    if (state.ui.layoutMenuOpen) {
      const menu = utils.createElement('div', 'tl-layout-menu');
      const activeMode = getLayoutMode(state);
      menu.setAttribute('role', 'menu');
      modes.forEach(function(mode) {
        const item = utils.createElement('button', 'tl-layout-option' + (mode.id === activeMode ? ' active' : ''), mode.label);
        item.type = 'button';
        item.setAttribute('data-tl-layout-mode', mode.id);
        item.addEventListener('click', function(event) {
          event.stopPropagation();
          state.ui.layoutMenuOpen = false;
          if (actions.setLayoutMode) {
            actions.setLayoutMode(mode.id);
            return;
          }
          state.prefs.layoutMode = prefs.normalizeLayoutMode(mode.id);
          prefs.savePrefs(state);
          if (layout) layout.applyLayout(state);
          render(state, actions || {});
        });
        menu.appendChild(item);
      });
      wrap.appendChild(menu);
    }

    return wrap;
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
