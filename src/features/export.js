(function(root) {
  const ns = root.TLTimelineModules = root.TLTimelineModules || {};
  const utils = ns.utils;

  function buildConversationExportData(groups, options) {
    return {
      title: utils.normalizeText(options && options.title) || 'ChatGPT Conversation',
      url: (options && options.url) || '',
      exportedAt: (options && options.exportedAt) || new Date().toISOString(),
      groupCount: (groups || []).length,
      groups: (groups || []).map(function(group) {
        return {
          index: group.index + 1,
          question: group.userTurn ? group.userTurn.text : '',
          answers: group.assistantTurns.map(function(turn) { return turn.text; }),
          turns: group.turns.map(function(turn) {
            return { role: turn.role, text: turn.text };
          })
        };
      })
    };
  }

  function formatConversationJson(groups, options) {
    return JSON.stringify(buildConversationExportData(groups, options), null, 2);
  }

  function formatConversationMarkdown(groups, options) {
    const data = buildConversationExportData(groups, options);
    const lines = ['# ' + data.title, '', '> ' + data.url, ''];
    data.groups.forEach(function(group) {
      lines.push('## ' + group.index + '. ' + (group.question || 'Message'));
      lines.push('');
      group.answers.forEach(function(answer) {
        lines.push(answer);
        lines.push('');
      });
    });
    return lines.join('\n').trim() + '\n';
  }

  function buildExportFilename(title, format) {
    const ext = format === 'json' ? 'json' : 'md';
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
    buildExportFilename: buildExportFilename,
    downloadTextFile: downloadTextFile
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
