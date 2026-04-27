(function(root) {
  const ns = root.TLTimelineModules = root.TLTimelineModules || {};
  const utils = ns.utils;

  function normalizeExportOptions(options) {
    const includeUser = !(options && options.includeUser === false);
    const includeAssistant = !(options && options.includeAssistant === false);
    const selectedGroupIds = Array.isArray(options && options.selectedGroupIds)
      ? (options.selectedGroupIds || []).map(function(id) { return String(id); }).filter(Boolean)
      : null;
    if (!includeUser && !includeAssistant) {
      return Object.assign({}, options || {}, {
        includeUser: true,
        includeAssistant: true,
        selectedGroupIds: selectedGroupIds
      });
    }
    return Object.assign({}, options || {}, {
      includeUser: includeUser,
      includeAssistant: includeAssistant,
      selectedGroupIds: selectedGroupIds
    });
  }

  function getExportLabels(options) {
    const labels = [];
    if (options.includeUser) labels.push('My input');
    if (options.includeAssistant) labels.push('GPT output');
    return labels;
  }

  function getIncludedTurns(group, options) {
    return (group.turns || []).filter(function(turn) {
      return (turn.role === 'u' && options.includeUser) || (turn.role === 'a' && options.includeAssistant);
    });
  }

  function buildConversationExportData(groups, options) {
    const exportOptions = normalizeExportOptions(options);
    const selectedGroupIds = exportOptions.selectedGroupIds;
    const selectedLookup = {};
    if (selectedGroupIds) {
      selectedGroupIds.forEach(function(id) {
        selectedLookup[id] = true;
      });
    }
    return {
      title: utils.normalizeText(exportOptions.title) || 'ChatGPT Conversation',
      url: exportOptions.url || '',
      exportedAt: exportOptions.exportedAt || new Date().toISOString(),
      includeUser: exportOptions.includeUser,
      includeAssistant: exportOptions.includeAssistant,
      selectedGroupIds: selectedGroupIds,
      includedLabels: getExportLabels(exportOptions),
      groupCount: (groups || []).length,
      groups: (groups || []).filter(function(group) {
        return !selectedGroupIds || selectedLookup[String(group.id)];
      }).map(function(group) {
        const includedTurns = getIncludedTurns(group, exportOptions);
        return {
          id: group.id || '',
          index: group.index + 1,
          question: group.userTurn ? group.userTurn.text : '',
          answers: group.assistantTurns.map(function(turn) { return turn.text; }),
          turns: includedTurns.map(function(turn) {
            return { role: turn.role, text: turn.text };
          })
        };
      }).filter(function(group) {
        return group.turns.length > 0;
      })
    };
  }

  function formatConversationJson(groups, options) {
    return JSON.stringify(buildConversationExportData(groups, options), null, 2);
  }

  function formatConversationMarkdown(groups, options) {
    const data = buildConversationExportData(groups, options);
    const includeBoth = data.includeUser && data.includeAssistant;
    const lines = ['# ' + data.title, ''];

    if (data.url) lines.push('> Source: ' + data.url);
    lines.push('> Exported: ' + data.exportedAt);
    lines.push('> Included: ' + data.includedLabels.join(' + '));
    lines.push('');

    data.groups.forEach(function(group) {
      lines.push('## ' + group.index + '. ' + getMarkdownSectionTitle(group, data));
      lines.push('');
      group.turns.forEach(function(turn, turnIndex) {
        if (includeBoth || group.turns.length > 1) {
          lines.push('**' + (turn.role === 'u' ? 'My input' : 'GPT output') + '**');
          lines.push('');
        }
        lines.push(turn.text);
        if (turnIndex < group.turns.length - 1) lines.push('');
        lines.push('');
      });
    });
    return lines.join('\n').trim() + '\n';
  }

  function getMarkdownSectionTitle(group, data) {
    if (data.includeUser && !data.includeAssistant) return 'My input';
    if (!data.includeUser && data.includeAssistant) return 'GPT output';
    return 'Conversation ' + group.index;
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatConversationPrintHtml(groups, options) {
    const data = buildConversationExportData(groups, options);
    const body = data.groups.map(function(group) {
      const turns = group.turns.map(function(turn) {
        const label = turn.role === 'u' ? 'My input' : 'GPT output';
        return '<section class="turn turn-' + escapeHtml(turn.role) + '">' +
          '<h3>' + escapeHtml(label) + '</h3>' +
          '<div class="turn-text">' + escapeHtml(turn.text) + '</div>' +
          '</section>';
      }).join('');
      return '<article class="group">' +
        '<h2>' + escapeHtml(group.index + '. ' + getMarkdownSectionTitle(group, data)) + '</h2>' +
        turns +
        '</article>';
    }).join('');

    return '<!doctype html>\n' +
      '<html><head><meta charset="utf-8">' +
      '<title>' + escapeHtml(data.title) + '</title>' +
      '<style>' +
      'body{font-family:Arial,"Microsoft YaHei",sans-serif;line-height:1.55;color:#111827;margin:32px;}' +
      'header{border-bottom:1px solid #d1d5db;margin-bottom:24px;padding-bottom:16px;}' +
      'h1{font-size:26px;margin:0 0 12px;}h2{font-size:18px;margin:0 0 12px;}h3{font-size:13px;margin:0 0 8px;color:#4b5563;text-transform:uppercase;letter-spacing:.04em;}' +
      '.meta{font-size:12px;color:#4b5563;margin:4px 0;word-break:break-all;}.group{break-inside:avoid;margin:0 0 24px;padding-bottom:16px;border-bottom:1px solid #e5e7eb;}' +
      '.turn{margin:12px 0;padding:12px 14px;border-radius:8px;background:#f9fafb;border:1px solid #e5e7eb;}.turn-a{background:#ffffff;}' +
      '.turn-text{white-space:pre-wrap;font-size:14px;}@media print{body{margin:20mm}.group{page-break-inside:avoid}}' +
      '</style></head><body>' +
      '<header><h1>' + escapeHtml(data.title) + '</h1>' +
      (data.url ? '<p class="meta">Source: ' + escapeHtml(data.url) + '</p>' : '') +
      '<p class="meta">Exported: ' + escapeHtml(data.exportedAt) + '</p>' +
      '<p class="meta">Included: ' + escapeHtml(data.includedLabels.join(' + ')) + '</p>' +
      '</header>' +
      body +
      '</body></html>';
  }

  function buildExportFilename(title, format) {
    const ext = format === 'json' ? 'json' : (format === 'pdf' ? 'pdf' : 'md');
    const slug = utils.normalizeText(title || 'chatgpt-conversation')
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 72) || 'chatgpt-conversation';
    return slug + '.' + ext;
  }

  function downloadTextFile(filename, mimeType, content) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = root.document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(function() { URL.revokeObjectURL(url); }, 500);
  }

  ns.exportFeature = {
    buildConversationExportData: buildConversationExportData,
    formatConversationJson: formatConversationJson,
    formatConversationMarkdown: formatConversationMarkdown,
    formatConversationPrintHtml: formatConversationPrintHtml,
    buildExportFilename: buildExportFilename,
    downloadTextFile: downloadTextFile
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
