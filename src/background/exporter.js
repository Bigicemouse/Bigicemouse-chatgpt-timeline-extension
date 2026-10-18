(function(root) {
  const chrome = root.chrome;
  const EXPORTER_VERSION = '1.6.0';
  const pending = new Map();

  async function loadAndOpen(tabId) {
    if (!Number.isInteger(tabId) || tabId < 0) throw new Error('请先打开 ChatGPT 标签页。');
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url || new URL(tab.url).origin !== 'https://chatgpt.com') {
      throw new Error('请在已登录的 ChatGPT 页面打开导出。');
    }
    const target = { tabId: tabId };
    const status = await chrome.scripting.executeScript({
      target: target,
      world: 'MAIN',
      func: function(version) {
        return !!(window.JSZip && window.ChatGPTExporter &&
          window.ChatGPTExporter.version === version &&
          typeof window.ChatGPTExporter.showDialog === 'function');
      },
      args: [EXPORTER_VERSION]
    });
    if (!status[0] || !status[0].result) {
      await chrome.scripting.executeScript({
        target: target,
        world: 'MAIN',
        files: ['src/vendor/jszip.min.js', 'src/vendor/chatgpt-exporter.js']
      });
    }
    const results = await chrome.scripting.executeScript({
      target: target,
      world: 'MAIN',
      func: function() {
        if (!window.ChatGPTExporter || typeof window.ChatGPTExporter.showDialog !== 'function') {
          return { ok: false, error: '导出组件未能加载，请刷新页面后重试。' };
        }
        if (!document.getElementById('tl-exporter-style')) {
          const style = document.createElement('style');
          style.id = 'tl-exporter-style';
          // Keep the export modal and progress panel above the timeline rail.
          style.textContent = '#export-dialog-overlay{z-index:1000001!important}' +
            '#gre-task-panel{z-index:1000002!important}';
          document.head.appendChild(style);
        }
        window.ChatGPTExporter.showDialog();
        return { ok: !!document.getElementById('export-dialog-overlay') };
      }
    });
    if (!results[0] || !results[0].result || !results[0].result.ok) {
      throw new Error(results[0] && results[0].result && results[0].result.error || '无法打开导出面板，请刷新 ChatGPT 页面后重试。');
    }
    return { ok: true };
  }

  function open(tabId) {
    if (!pending.has(tabId)) {
      pending.set(tabId, loadAndOpen(tabId).finally(function() { pending.delete(tabId); }));
    }
    return pending.get(tabId);
  }

  function handleMessage(message, sender, sendResponse) {
    if (!message || message.type !== 'tl-open-exporter') return false;
    if (!sender || sender.id !== chrome.runtime.id ||
        sender.url !== chrome.runtime.getURL('src/popup/popup.html')) return false;
    open(message.tabId).then(sendResponse, function(error) {
      sendResponse({ ok: false, error: error.message || '无法打开导出面板，请重试。' });
    });
    return true;
  }

  root.TLExporterBridge = { open: open, handleMessage: handleMessage };
  chrome.runtime.onMessage.addListener(handleMessage);
})(typeof globalThis !== 'undefined' ? globalThis : this);
