(function(root) {
  const ns = root.TLTimelineModules = root.TLTimelineModules || {};
  const utils = ns.utils;

  const DEFAULT_TRACK_HEIGHT = 160;
  const TRACK_PADDING = 16;
  const MIN_MARKER_GAP = 28;

  function getScrollTop(scrollContainer) {
    return Math.max(0, Number(scrollContainer && scrollContainer.scrollTop) || 0);
  }

  function getElementTopInScrollContainer(element, scrollContainer) {
    if (!element || !element.getBoundingClientRect) return null;
    try {
      const elementRect = element.getBoundingClientRect();
      const containerRect = scrollContainer && scrollContainer.getBoundingClientRect
        ? scrollContainer.getBoundingClientRect()
        : { top: 0 };
      const top = elementRect.top - (Number(containerRect.top) || 0) + getScrollTop(scrollContainer);
      return Number.isFinite(top) ? top : null;
    } catch (error) {
      return null;
    }
  }

  function normalizeRatio(value) {
    if (!Number.isFinite(value)) return null;
    return utils.clamp(value, 0, 1);
  }

  function buildFallbackRatio(index, total) {
    return total > 1 ? index / (total - 1) : 0.5;
  }

  function buildTimelineGeometry(groups, activeGroupId, scrollContainer, options) {
    const sourceItems = utils.buildRailTimelineItems(groups, activeGroupId).items;
    const itemCount = sourceItems.length;
    const minTrackHeight = Math.max(
      Number(options && options.minTrackHeight) || DEFAULT_TRACK_HEIGHT,
      TRACK_PADDING * 2 + Math.max(0, itemCount - 1) * MIN_MARKER_GAP
    );
    const usableHeight = Math.max(1, minTrackHeight - TRACK_PADDING * 2);
    const tops = sourceItems.map(function(item) {
      return getElementTopInScrollContainer(item.group && item.group.anchorTurn && item.group.anchorTurn.el, scrollContainer);
    });
    const finiteTops = tops.filter(function(top) { return Number.isFinite(top); });
    const hasGeometry = finiteTops.length >= 2 && finiteTops[finiteTops.length - 1] > finiteTops[0];
    const firstTop = hasGeometry ? finiteTops[0] : 0;
    const span = hasGeometry ? Math.max(1, finiteTops[finiteTops.length - 1] - firstTop) : 1;

    return {
      contentHeight: minTrackHeight,
      pad: TRACK_PADDING,
      minGap: MIN_MARKER_GAP,
      items: sourceItems.map(function(item, index) {
        const ratio = hasGeometry && Number.isFinite(tops[index])
          ? normalizeRatio((tops[index] - firstTop) / span)
          : buildFallbackRatio(index, itemCount);
        const y = Math.round(TRACK_PADDING + (ratio == null ? 0 : ratio) * usableHeight);
        return Object.assign({}, item, {
          y: y,
          yRatio: ratio == null ? 0 : ratio,
          hasDomGeometry: hasGeometry && Number.isFinite(tops[index])
        });
      })
    };
  }

  ns.geometry = {
    buildTimelineGeometry: buildTimelineGeometry,
    getElementTopInScrollContainer: getElementTopInScrollContainer
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
