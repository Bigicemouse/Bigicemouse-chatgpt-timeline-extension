(function(root) {
  const ns = root.TLTimelineModules = root.TLTimelineModules || {};

  function toFiniteNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function clamp(value, minValue, maxValue) {
    return Math.max(minValue, Math.min(maxValue, value));
  }

  function computeVirtualWindow(options) {
    const itemCount = Math.max(0, Math.floor(toFiniteNumber(options && options.itemCount, 0)));
    const rowHeight = Math.max(1, toFiniteNumber(options && options.rowHeight, 1));
    const viewportHeight = Math.max(0, toFiniteNumber(options && options.viewportHeight, 0));
    const scrollTop = Math.max(0, toFiniteNumber(options && options.scrollTop, 0));
    const overscan = Math.max(0, Math.floor(toFiniteNumber(options && options.overscan, 0)));
    const totalHeight = itemCount * rowHeight;

    if (!itemCount) {
      return {
        startIndex: 0,
        endIndex: 0,
        offsetTop: 0,
        totalHeight: 0,
        renderedCount: 0
      };
    }

    const visibleStart = clamp(Math.floor(scrollTop / rowHeight), 0, itemCount - 1);
    const visibleEnd = clamp(Math.ceil((scrollTop + viewportHeight) / rowHeight), visibleStart + 1, itemCount);
    const startIndex = clamp(visibleStart - overscan, 0, itemCount);
    const endIndex = clamp(visibleEnd + overscan, startIndex, itemCount);

    return {
      startIndex: startIndex,
      endIndex: endIndex,
      offsetTop: startIndex * rowHeight,
      totalHeight: totalHeight,
      renderedCount: Math.max(0, endIndex - startIndex)
    };
  }

  ns.virtualList = {
    computeVirtualWindow: computeVirtualWindow
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
