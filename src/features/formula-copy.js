(function(root) {
  const ns = root.TLTimelineModules = root.TLTimelineModules || {};
  const TOAST_DURATION_MS = 1600;
  const TOAST_OFFSET_Y = 40;

  let initialized = false;
  let enabled = true;
  let toast = null;
  let toastTimer = null;

  function hasTextSelection() {
    try {
      const selection = root.getSelection && root.getSelection();
      return !!(selection && String(selection.toString() || '').trim());
    } catch (error) {
      return false;
    }
  }

  function findDataMathInSubtree(element) {
    if (!element || !element.querySelector) return null;
    const node = element.querySelector('[data-math]');
    return node instanceof root.HTMLElement ? node : null;
  }

  function findMathElement(target) {
    const node = target && target.nodeType === 1 ? target : target && target.parentElement;
    if (!node || !node.closest) return null;

    const direct = node.closest('[data-math]');
    if (direct instanceof root.HTMLElement) return direct;

    const mathContainer = node.closest('.math-inline,.math-block');
    if (mathContainer instanceof root.HTMLElement) {
      return findDataMathInSubtree(mathContainer) || mathContainer;
    }

    const katex = node.closest('.katex');
    if (katex instanceof root.HTMLElement) {
      const display = katex.closest('.katex-display');
      return display instanceof root.HTMLElement ? display : katex;
    }

    const displayContainer = node.closest('.katex-display');
    if (displayContainer instanceof root.HTMLElement) return displayContainer;

    return null;
  }

  function extractLatexSource(element) {
    if (!element) return '';

    const dataMath = element.getAttribute && element.getAttribute('data-math');
    if (dataMath) return String(dataMath).trim();

    const dataMathChild = findDataMathInSubtree(element);
    if (dataMathChild) {
      const childMath = dataMathChild.getAttribute('data-math');
      if (childMath) return String(childMath).trim();
    }

    const typedAnnotation = element.querySelector && element.querySelector('annotation[encoding="application/x-tex"]');
    if (typedAnnotation && typedAnnotation.textContent) return typedAnnotation.textContent.trim();

    const anyAnnotation = element.querySelector && element.querySelector('annotation');
    if (anyAnnotation && anyAnnotation.textContent) return anyAnnotation.textContent.trim();

    return '';
  }

  function stripMathDelimiters(formula) {
    const text = String(formula || '').trim();
    if (text.length >= 4 && text.slice(0, 2) === '$$' && text.slice(-2) === '$$') return text.slice(2, -2).trim();
    if (text.length >= 4 && text.slice(0, 2) === '\\[' && text.slice(-2) === '\\]') return text.slice(2, -2).trim();
    if (text.length >= 4 && text.slice(0, 2) === '\\(' && text.slice(-2) === '\\)') return text.slice(2, -2).trim();
    if (text.length >= 2 && text.charAt(0) === '$' && text.charAt(text.length - 1) === '$') return text.slice(1, -1).trim();
    return text;
  }

  function isDisplayMode(element) {
    if (!element) return false;
    if (element.closest && element.closest('.math-block,.katex-display')) return true;
    const math = element.querySelector && element.querySelector('math[display="block"]');
    return !!math;
  }

  function wrapFormula(formula, displayMode) {
    const source = stripMathDelimiters(formula);
    if (!source) return '';
    return displayMode ? '$$' + source + '$$' : '$' + source + '$';
  }

  function copyToClipboardLegacy(text) {
    if (!root.document || !root.document.body) return false;
    const textarea = root.document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-999px';
    textarea.style.left = '-999px';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    root.document.body.appendChild(textarea);
    textarea.select();
    try {
      return !!root.document.execCommand('copy');
    } catch (error) {
      return false;
    } finally {
      textarea.remove();
    }
  }

  function copyToClipboard(text) {
    if (root.navigator && root.navigator.clipboard && root.navigator.clipboard.writeText) {
      return root.navigator.clipboard.writeText(text).then(function() {
        return true;
      }).catch(function() {
        return copyToClipboardLegacy(text);
      });
    }
    return Promise.resolve(copyToClipboardLegacy(text));
  }

  function ensureToast() {
    if (toast && root.document && root.document.body && root.document.body.contains(toast)) return toast;
    toast = root.document.createElement('div');
    toast.className = 'tl-formula-copy-toast';
    root.document.body.appendChild(toast);
    return toast;
  }

  function showToast(message, clientX, clientY, success) {
    if (!root.document || !root.document.body) return;
    const node = ensureToast();
    node.textContent = message;
    node.classList.toggle('tl-formula-copy-toast-success', !!success);
    node.classList.toggle('tl-formula-copy-toast-error', !success);
    node.style.left = Math.max(8, Number(clientX) || 8) + 'px';
    node.style.top = Math.max(8, (Number(clientY) || 8) - TOAST_OFFSET_Y) + 'px';
    node.classList.add('show');
    if (toastTimer) root.clearTimeout(toastTimer);
    toastTimer = root.setTimeout(function() {
      if (toast) toast.classList.remove('show');
      toastTimer = null;
    }, TOAST_DURATION_MS);
  }

  function handleClick(event) {
    if (!enabled) return;
    if (hasTextSelection()) return;
    const mathElement = findMathElement(event.target);
    if (!mathElement) return;

    const latex = extractLatexSource(mathElement);
    if (!latex) return;

    const text = wrapFormula(latex, isDisplayMode(mathElement));
    if (!text) return;

    event.preventDefault();
    event.stopPropagation();
    copyToClipboard(text).then(function(success) {
      showToast(success ? '已复制公式' : '复制失败', event.clientX, event.clientY, success);
    });
  }

  function initialize() {
    if (initialized || !root.document || !root.document.addEventListener) return;
    if (ns.styles && ns.styles.ensureStyle) ns.styles.ensureStyle();
    root.document.addEventListener('click', handleClick, true);
    initialized = true;
  }

  function setEnabled(nextEnabled) {
    enabled = nextEnabled !== false;
    return enabled;
  }

  function isEnabled() {
    return enabled;
  }

  function destroy() {
    if (initialized && root.document && root.document.removeEventListener) {
      root.document.removeEventListener('click', handleClick, true);
    }
    initialized = false;
    if (toastTimer) root.clearTimeout(toastTimer);
    toastTimer = null;
    if (toast && toast.remove) toast.remove();
    toast = null;
  }

  ns.formulaCopy = {
    initialize: initialize,
    destroy: destroy,
    setEnabled: setEnabled,
    isEnabled: isEnabled,
    findMathElement: findMathElement,
    extractLatexSource: extractLatexSource,
    isDisplayMode: isDisplayMode,
    stripMathDelimiters: stripMathDelimiters,
    wrapFormula: wrapFormula,
    copyToClipboard: copyToClipboard,
    handleClick: handleClick
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
