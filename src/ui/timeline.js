(function(root) {
  const ns = root.TLTimelineModules = root.TLTimelineModules || {};
  const utils = ns.utils;
  const styles = ns.styles;
  const prefs = ns.state;
  const layout = ns.layout;
  const locator = ns.locator;
  const geometry = ns.geometry;
  const CONSTANTS = utils.CONSTANTS;

  function destroyUI(state) {
    cancelHoverClose(state);
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
    while (panel.firstChild) panel.removeChild(panel.firstChild);
    renderCollapsed(panel, state, actions || {});
    if (state.ui.hoverPreview) renderHoverPreview(panel, state, actions || {});
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
      render(state, actions || {});
    }, 180);
  }

  function openHoverPreview(state, actions) {
    if (!state || !state.ui) return;
    cancelHoverClose(state);
    if (state.ui.hoverPreview) return;
    state.ui.hoverPreview = true;
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
    const rail = utils.createElement('nav', 'tl-marker-rail');
    const track = utils.createElement('div', 'tl-marker-track');
    const content = utils.createElement('div', 'tl-marker-track-content');
    const activeId = state.activeGroupId || (state.groups[0] && state.groups[0].id) || '';
    const scrollTarget = state.scrollEl || (locator && locator.findScrollTarget && locator.findScrollTarget());
    const markerGeometry = geometry.buildTimelineGeometry(state.groups, activeId, scrollTarget);

    rail.setAttribute('aria-label', 'Conversation markers');
    rail.addEventListener('mouseenter', function() {
      openHoverPreview(state, actions);
    });
    rail.addEventListener('mouseleave', function() {
      scheduleHoverClose(state, actions);
    });
    content.style.height = markerGeometry.contentHeight + 'px';

    markerGeometry.items.forEach(function(item) {
      const node = utils.createElement('button', 'tl-timeline-marker' + (item.active ? ' tl-marker-active' : ''));
      node.type = 'button';
      node.title = (item.index + 1) + '/' + state.groups.length + ' ' + item.title;
      node.setAttribute('aria-label', node.title);
      node.setAttribute('data-tl-group-id', item.id);
      node.style.top = item.y + 'px';
      node.addEventListener('click', function(event) {
        event.stopPropagation();
        if (actions.jumpToGroup) actions.jumpToGroup(item.group);
      });
      content.appendChild(node);
    });

    track.appendChild(content);
    rail.appendChild(track);
    panel.appendChild(rail);
  }

  function renderHoverPreview(panel, state, actions) {
    const activeId = state.activeGroupId || (state.groups[0] && state.groups[0].id) || '';
    const previewItems = utils.buildRailTimelineItems(state.groups, activeId).items;
    const card = utils.createElement('div', 'tl-hover-card');
    let activeRow = null;

    card.addEventListener('mouseenter', function() {
      cancelHoverClose(state);
    });
    card.addEventListener('mouseleave', function() {
      scheduleHoverClose(state, actions);
    });

    previewItems.forEach(function(item) {
      const row = utils.createElement('button', 'tl-hover-row' + (item.active ? ' active' : ''));
      const title = utils.createElement('span', 'tl-hover-title', item.title);
      const mark = utils.createElement('span', 'tl-hover-mark');

      row.type = 'button';
      row.title = (item.index + 1) + '/' + state.groups.length + ' ' + item.group.summary;
      row.setAttribute('data-tl-group-id', item.id);
      row.addEventListener('click', function(event) {
        event.stopPropagation();
        if (actions.jumpToGroup) actions.jumpToGroup(item.group);
      });
      row.appendChild(title);
      row.appendChild(mark);
      card.appendChild(row);
      if (item.active) activeRow = row;
    });

    panel.appendChild(card);
    if (activeRow) {
      card.scrollTop = Math.max(0, activeRow.offsetTop - (card.clientHeight / 2) + (activeRow.offsetHeight / 2));
    }
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
