# Timeline Freeze Fix and UI Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix timeline freezing/unresponsive issue during multi-turn conversations (especially during streaming), and improve export formatting and overall UI aesthetics.

**Architecture:** The freeze is caused by a MutationObserver render loop: DOM mutations during streaming trigger `scheduleRefresh` → `collectTurns` → `applyTurns` → `timeline.render` → DOM rebuild → more observer fires. Fix by adding render throttling, skipping no-change renders via signature comparison, and patching markers instead of full DOM rebuild. UI improvements focus on CSS variable consistency, export formatting, and toolbar layout.

**Tech Stack:** Vanilla JS (Chrome MV3 extension), DOM manipulation, CSS custom properties

---

## Root Cause Analysis

### Freeze / Scroll Lock

1. **MutationObserver render loop** (`content-main.js:219-234`): Observer fires on every DOM change (`childList: true, subtree: true, characterData: true`). During ChatGPT streaming, DOM updates every 100-500ms. Each callback → `scheduleRefresh(220ms)` → `collectTurns()` → `applyTurns()` → `timeline.render()` → DOM mutations → observer fires again. The `shouldIgnoreMutationBatch` guard only works when ALL mutations are timeline-owned, but streaming produces mixed (content + timeline) mutations.

2. **Full DOM teardown on every render** (`timeline.js:61`): `while (panel.firstChild) panel.removeChild(panel.firstChild)` destroys everything, then `renderCollapsed` rebuilds all markers + `renderHoverPreview` rebuilds the full scrollable list. This is O(n) DOM writes per render.

3. **No minimum render interval**: The 220ms `scheduleRefresh` debounce becomes a tight polling interval during sustained streaming, leaving no idle time for user interaction.

4. **Preview scroll triggers re-render conflicts** (`timeline.js:357-365`): Scroll handler requests rAF → `render()` → DOM changes → observer fires → another `scheduleRefresh` → race condition on `state.ui.previewScrollTop`.

### Export & UI Issues

5. **Export loses code formatting**: Markdown export (`export.js:79-103`) prints raw text with no code block preservation, no syntax formatting, no metadata header.

6. **PDF exports open browser print dialog only**: The `formatConversationPrintHtml` produces basic HTML with no dedicated PDF path, no page-break control, no proper print typography.

7. **UI inconsistencies**: `--tl-marker-hover: #256f7a` (teal) vs `--tl-row-active-bg: #f3f6fb` (blue-tinted) create visual mismatch. Rail `border-radius: 8px` vs card `border-radius: 6px` are inconsistent. Toolbar is cramped with 6+ controls in ~390px.

8. **`buildQaGroups` creates orphan groups for consecutive assistant messages** (`utils.js:105-113`): Tool calls and intermediate assistant messages get `userTurn: null` groups with short/empty summaries, multiplying marker count and breaking navigation.

---

## Implementation Tasks

### Task 1: Fix buildQaGroups for Consecutive Assistant Messages

**Files:**
- Modify: `src/core/utils.js:82-137`

**Goal:** Merge consecutive assistant-only turns into the previous group instead of creating orphan groups. Only start a new group when a user turn is encountered.

- [ ] **Step 1: Update `buildQaGroups` to merge assistant-only blocks**

Replace the assistant group creation logic at lines 104-113:

```javascript
// BEFORE (lines 102-118):
// if (!current) {
//   current = {
//     userTurn: null,
//     assistantTurns: [],
//     turns: [],
//     anchorTurn: turn,
//     summary: '',
//     assistantSummary: '',
//     searchText: ''
//   };
// }
// current.assistantTurns.push(turn);
// current.turns.push(turn);

// AFTER:
if (!current) {
  // Consecutive assistant messages at the start — still create a group for them
  current = {
    userTurn: null,
    assistantTurns: [turn],
    turns: [turn],
    anchorTurn: turn,
    summary: '',
    assistantSummary: '',
    searchText: ''
  };
} else if (!current.userTurn && !current.assistantTurns.length) {
  current.assistantTurns = [turn];
  current.turns = [turn];
  current.anchorTurn = turn;
} else {
  current.assistantTurns.push(turn);
  current.turns.push(turn);
}
```

- [ ] **Step 2: Update test expectations in `content-script.test.html`**

Verify the existing tests still pass (they test a 4-turn conversation with alternating u/a/u/a). Run the test page in a browser.

- [ ] **Step 3: Commit**

```bash
git add src/core/utils.js
git commit -m "fix: merge consecutive assistant-only turns into previous group to prevent orphan markers"
```

---

### Task 2: Add Render Throttling and Skip No-Change Renders

**Files:**
- Modify: `src/ui/timeline.js:42-64`
- Modify: `src/content-main.js:86-98`

**Goal:** Skip `render()` calls when turn data signature and activeGroupId are identical to the last render. Enforce a minimum interval between renders (600ms) to keep the UI thread available for user interaction.

- [ ] **Step 1: Add render state tracking to the state object**

In `src/core/state.js:49-83`, add fields `lastRenderSignature` and `lastRenderTime` to `createState()`:

```javascript
// Add inside createState() return object, after ui: {}:
lastRenderSignature: '',
lastRenderTime: 0,
```

- [ ] **Step 2: Build a render-specific signature and skip check in timeline.js**

In `src/ui/timeline.js`, add a function before `render()`:

```javascript
const MIN_RENDER_INTERVAL_MS = 600;

function shouldSkipRender(state) {
  var now = Date.now();
  var signature = state.groups.map(function(g) {
    return g.id + '|' + (g.anchorTurn && g.anchorTurn.id) + '|' + (g.anchorTurn && g.anchorTurn.seenInCurrentDom ? 1 : 0);
  }).join(',');
  signature += '|active:' + (state.activeGroupId || '');

  if (signature === state.lastRenderSignature && (now - (state.lastRenderTime || 0)) < MIN_RENDER_INTERVAL_MS) {
    return true;
  }
  state.lastRenderSignature = signature;
  state.lastRenderTime = now;
  return false;
}
```

- [ ] **Step 3: Guard render() with shouldSkipRender**

At the top of `render()` (after the `if (!panel) return;` line):

```javascript
if (shouldSkipRender(state)) return;
```

- [ ] **Step 4: Verify with test page**

Run `content-script.test.html` and confirm all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/core/state.js src/ui/timeline.js
git commit -m "perf: add render throttling with signature-based skip to prevent UI freeze during streaming"
```

---

### Task 3: Optimize renderCollapsed to Patch Instead of Rebuild

**Files:**
- Modify: `src/ui/timeline.js:126-168`

**Goal:** Instead of `while (panel.firstChild) panel.removeChild(panel.firstChild)` on every render, reuse existing DOM nodes and only update positions and active classes.

- [ ] **Step 1: Write a marker update-only version of renderCollapsed**

Replace `renderCollapsed` to detect if the rail already exists and patch it instead of rebuilding:

```javascript
function renderCollapsed(panel, state, actions) {
  var existingRail = utils.qs('.tl-marker-rail', panel);
  if (existingRail) {
    patchCollapsedRail(existingRail, state, actions);
    return;
  }

  var rail = utils.createElement('nav', 'tl-marker-rail');
  var track = utils.createElement('div', 'tl-marker-track');
  var content = utils.createElement('div', 'tl-marker-track-content');
  var activeId = state.activeGroupId || (state.groups[0] && state.groups[0].id) || '';
  var scrollTarget = state.scrollEl || (locator && locator.findScrollTarget && locator.findScrollTarget());
  var markerGeometry = buildMarkerGeometry(state.groups, activeId, scrollTarget);

  setupRail(rail, state, actions);
  content.style.height = markerGeometry.contentHeight + 'px';
  populateMarkers(content, markerGeometry.items, state);
  track.appendChild(content);
  rail.appendChild(track);
  panel.appendChild(rail);
}

function patchCollapsedRail(rail, state, actions) {
  var activeId = state.activeGroupId || (state.groups[0] && state.groups[0].id) || '';
  var scrollTarget = state.scrollEl || (locator && locator.findScrollTarget && locator.findScrollTarget());
  var markerGeometry = buildMarkerGeometry(state.groups, activeId, scrollTarget);
  var content = utils.qs('.tl-marker-track-content', rail);

  if (!content) return;
  content.style.height = markerGeometry.contentHeight + 'px';
  utils.qsa('.tl-timeline-marker', content).forEach(function(node) {
    var groupId = node.getAttribute('data-tl-group-id');
    var item = markerGeometry.items.find(function(i) { return i.id === groupId; });
    if (!item) {
      node.remove();
      return;
    }
    node.style.top = item.y + 'px';
    var isActive = item.id === activeId;
    node.classList.toggle('tl-marker-active', isActive);
    node.classList.toggle('active', isActive);
    node.title = (item.index + 1) + '/' + state.groups.length + ' ' + item.title;
    node.setAttribute('aria-label', node.title);
  });
  // Add new markers that don't exist yet
  var existingIds = {};
  utils.qsa('.tl-timeline-marker', content).forEach(function(node) {
    existingIds[node.getAttribute('data-tl-group-id')] = true;
  });
  markerGeometry.items.forEach(function(item) {
    if (!existingIds[item.id]) {
      var node = createMarkerNode(item, state);
      content.appendChild(node);
    }
  });
}
```

- [ ] **Step 2: Extract shared helpers**

Extract `setupRail`, `populateMarkers`, and `createMarkerNode` as helper functions:

```javascript
function setupRail(rail, state, actions) {
  rail.setAttribute('aria-label', 'Conversation markers');
  rail.addEventListener('mouseenter', function() { openHoverPreview(state, actions); });
  rail.addEventListener('mouseleave', function() { scheduleHoverClose(state, actions); });
  rail.addEventListener('click', function(event) {
    var target = event.target;
    if (target && target.closest && target.closest('.tl-timeline-marker')) return;
    var group = getRailGroupFromClick(state.groups, event, rail);
    if (!group) return;
    event.stopPropagation();
    if (actions.jumpToGroup) actions.jumpToGroup(group);
  });
}

function populateMarkers(content, items, state) {
  items.forEach(function(item) {
    content.appendChild(createMarkerNode(item, state));
  });
}

function createMarkerNode(item, state) {
  var node = utils.createElement('button', 'tl-timeline-marker' + (item.active ? ' tl-marker-active' : ''));
  node.type = 'button';
  node.title = (item.index + 1) + '/' + state.groups.length + ' ' + item.title;
  node.setAttribute('aria-label', node.title);
  node.setAttribute('data-tl-group-id', item.id);
  node.style.top = item.y + 'px';
  node.style.setProperty('--tl-accent', getAccentColor(item.index));
  node.addEventListener('click', function(event) {
    event.stopPropagation();
    if (actions.jumpToGroup) actions.jumpToGroup(item.group);
  });
  return node;
}
```

- [ ] **Step 3: Test the test page**

Run `content-script.test.html`. The test clicks markers and checks counts — these tests must still pass because the DOM structure is unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/ui/timeline.js
git commit -m "perf: patch rail markers instead of full rebuild to reduce DOM thrash during streaming"
```

---

### Task 4: Stabilize Preview Scroll During Re-renders

**Files:**
- Modify: `src/ui/timeline.js:270-291`, `src/ui/timeline.js:344-382`

**Goal:** When the preview list re-renders due to data changes, preserve the user's scroll position instead of resetting it to the auto-scroll target. Only auto-scroll when `previewAutoScrollKey` has changed (i.e., data actually changed).

- [ ] **Step 1: Guard scroll position preservation in renderHoverPreview**

In `renderHoverPreview`, after building `previewItems`, save the current scroll position BEFORE clearing the card:

```javascript
function renderHoverPreview(panel, state, actions) {
  var activeId = state.activeGroupId || (state.groups[0] && state.groups[0].id) || '';
  var previewItems = getFilteredPreviewItems(state, activeId);
  var card = utils.createElement('div', 'tl-hover-card');
  // ... rest of function
}
```

The fix is in `renderPreviewList` at line 352: ensure `state.ui.previewScrollTop` is only overwritten when `previewAutoScrollKey` differs:

```javascript
// At line 352, replace:
// state.ui.previewScrollTop = scrollTop;

// With:
var autoScrollKey = [activeId, previewItems.length, getSearchQuery(state)].join('|');
if (state.ui.previewAutoScrollKey !== autoScrollKey) {
  state.ui.previewScrollTop = scrollTop;
  state.ui.previewAutoScrollKey = autoScrollKey;
}
```

- [ ] **Step 2: Verify scroll behavior with live testing**

Load the extension in Chrome and test on a long conversation:
1. Hover the rail to open preview
2. Scroll down in the preview list
3. Wait for a DOM refresh (or trigger one by switching tabs)
4. Confirm the scroll position is preserved

- [ ] **Step 3: Commit**

```bash
git add src/ui/timeline.js
git commit -m "fix: preserve preview scroll position across re-renders to prevent UI jitter"
```

---

### Task 5: Improve Markdown Export Formatting

**Files:**
- Modify: `src/features/export.js:79-103`

**Goal:** Preserve code blocks and improve Markdown export structure with proper formatting, metadata header including model info if available.

- [ ] **Step 1: Rewrite `formatConversationMarkdown` with better formatting**

```javascript
function formatConversationMarkdown(groups, options) {
  var data = buildConversationExportData(groups, options);
  var lines = [
    '# ' + data.title,
    '',
    '| | |',
    '|---|---|',
    '| Source | ' + (data.url || 'N/A') + ' |',
    '| Exported | ' + data.exportedAt + ' |',
    '| Groups | ' + data.groupCount + ' |',
    '| Included | ' + data.includedLabels.join(' + ') + ' |',
    '',
    '---',
    ''
  ];

  data.groups.forEach(function(group) {
    lines.push('## ' + group.index + '. ' + group.question.substring(0, 120));
    lines.push('');

    group.turns.forEach(function(turn) {
      var roleLabel = turn.role === 'u' ? 'You' : 'ChatGPT';
      lines.push('### ' + roleLabel);
      lines.push('');

      // Preserve code blocks and formatting in the text
      var text = turn.text || '';
      text.split('\n').forEach(function(line) {
        lines.push(line);
      });
      lines.push('');
      lines.push('');
    });

    if (group.answers.length && data.includeAssistant) {
      lines.push('---');
      lines.push('');
    }
  });

  return lines.join('\n').trim() + '\n';
}
```

- [ ] **Step 2: Add code block preservation**

Add a helper that detects code fences in turn text and ensures they're properly separated:

```javascript
function sanitizeMarkdownText(text) {
  // Ensure code blocks are separated from surrounding text
  return String(text || '').replace(/([^\n])\n```/g, '$1\n\n```').replace(/```\n([^\n])/g, '```\n\n$1');
}
```

Call this in the format function when writing turn text.

- [ ] **Step 3: Test export**

Open the test page, then call `window.__TL_TEST_API__.formatConversationMarkdown(groups, options)` with mock data containing code blocks. Verify the output in a Markdown previewer.

- [ ] **Step 4: Commit**

```bash
git add src/features/export.js
git commit -m "feat: improve Markdown export with proper code block preservation and metadata table"
```

---

### Task 6: Improve PDF Export with Better Print Styles

**Files:**
- Modify: `src/features/export.js:120-154`

**Goal:** Enhance the print HTML with professional typography, proper page breaks, landscape hint, and code block styling.

- [ ] **Step 1: Rewrite print CSS**

Replace the inline style block in `formatConversationPrintHtml`:

```javascript
'<style>' +
'*{box-sizing:border-box;}' +
'body{font-family:"Georgia","Times New Roman",serif;font-size:15px;line-height:1.65;color:#1a1a1a;max-width:720px;margin:0 auto;padding:40px 32px;}' +
'header{border-bottom:2px solid #d1d5db;margin-bottom:32px;padding-bottom:20px;}' +
'h1{font-size:28px;font-weight:700;margin:0 0 12px;color:#111827;}' +
'h2{font-size:20px;font-weight:600;margin:32px 0 14px;padding-bottom:8px;border-bottom:1px solid #e5e7eb;color:#1f2937;}' +
'h3{font-size:12px;font-weight:600;margin:0 0 8px;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;}' +
'.meta{font-size:12px;color:#6b7280;margin:4px 0;}.meta a{color:#256f7a;}' +
'.group{margin:0 0 32px;page-break-inside:avoid;}' +
'.turn{margin:12px 0;padding:16px 18px;border-radius:8px;background:#f9fafb;border:1px solid #e5e7eb;}' +
'.turn.turn-a{background:#ffffff;border-color:#d1d5db;}' +
'.turn-text{white-space:pre-wrap;font-size:14px;font-family:"SF Mono","Fira Code","Consolas",monospace;}' +
'.turn-text code,.turn-text pre{background:#f3f4f6;border-radius:4px;font-size:13px;}' +
'.turn-text pre{background:#1f2937;color:#f9fafb;padding:14px 16px;border-radius:6px;overflow-x:auto;}' +
'@media print{body{margin:15mm 20mm;font-size:13px;}' +
'.group{page-break-inside:avoid;}' +
'h2{page-break-after:avoid;}' +
'h3{page-break-after:avoid;}' +
'.turn{page-break-inside:avoid;background:#fff;border:1px solid #e5e7eb;}}' +
'</style>'
```

- [ ] **Step 2: Format turn text for HTML display**

When writing turn text in HTML, preserve newlines and escape properly:

```javascript
// In the body building, for each turn:
'<div class="turn-text">' + escapeHtml(turn.text).replace(/\n/g, '<br>') + '</div>'
```

- [ ] **Step 3: Test PDF export in Chrome**

Load the extension, navigate to a conversation, hover the rail, click "导出 PDF", verify the print preview is well-formatted.

- [ ] **Step 4: Commit**

```bash
git add src/features/export.js
git commit -m "feat: improve PDF export with professional print typography and page-break control"
```

---

### Task 7: UI Polish — CSS Variable Consistency and Refined Typography

**Files:**
- Modify: `src/ui/styles.js:5-551`

**Goal:** Unify the color palette, fix border-radius inconsistency, refine typography, and adjust spacing to improve visual harmony.

- [ ] **Step 1: Unify accent colors**

Replace the teal accent `#256f7a` with a more neutral blue-gray `#475569` for light mode and keep the sky-blue `#60a5fa` for dark mode. Update all `--tl-marker-hover`, `--tl-marker-active`, and `--tl-focus` references consistently:

```css
:root{
  --tl-marker-hover:#475569;
  --tl-marker-active:#475569;
  --tl-focus:rgba(71,85,105,.28);
  --tl-row-active-bg:#f1f5f9;
  --tl-row-hover-bg:#f8fafc;
}
html.dark{
  --tl-marker-hover:#60a5fa;
  --tl-marker-active:#60a5fa;
  --tl-focus:rgba(96,165,250,.40);
  --tl-row-active-bg:rgba(96,165,250,.14);
  --tl-row-hover-bg:rgba(255,255,255,.06);
}
```

- [ ] **Step 2: Fix border-radius consistency**

Change the hover card `border-radius` from `6px` to `8px` to match the rail:

```css
.tl-hover-card{
  border-radius:8px;
}
```

- [ ] **Step 3: Refine report header typography**

Change the title font from Georgia serif to system sans-serif with adjusted weight:

```css
.tl-report-title{
  font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  font-size:17px;
  font-weight:650;
}
```

And the eyebrow:
```css
.tl-report-eyebrow{
  font-size:11px;
  letter-spacing:.04em;
}
```

- [ ] **Step 4: Improve toolbar spacing**

Add more breathing room to the toolbar:

```css
.tl-export-toolbar{
  gap:10px;
  padding:12px 14px;
}
.tl-export-button{
  padding:0 10px;
}
```

- [ ] **Step 5: Dark mode header gradient refinement**

```css
html.dark .tl-report-header{
  background:linear-gradient(180deg,#1c1c20 0%,#222228 100%);
}
```

- [ ] **Step 6: Visual test**

Load the extension in Chrome, verify the timeline card looks consistent in both light and dark mode on a ChatGPT conversation page.

- [ ] **Step 7: Commit**

```bash
git add src/ui/styles.js
git commit -m "style: unify CSS color palette, fix border-radius consistency, and refine typography"
```

---

### Task 8: Integration Testing

**Files:**
- Modify: `content-script.test.html` (add new tests)

**Goal:** Add tests for the new `buildQaGroups` behavior (consecutive assistant messages), render throttling, and export formatting improvements.

- [ ] **Step 1: Add test for consecutive assistant grouping**

In the test file, after the existing `buildQaGroups` tests:

```javascript
// Test consecutive assistant turns (tool calls)
var toolTurns = [
  { id: 'tool-u1', role: 'u', text: 'Run this for me', sortIndex: 1 },
  { id: 'tool-a1', role: 'a', text: 'Tool output 1', sortIndex: 2 },
  { id: 'tool-a2', role: 'a', text: 'Tool output 2', sortIndex: 3 },
  { id: 'tool-u2', role: 'u', text: 'Continue', sortIndex: 4 },
  { id: 'tool-a3', role: 'a', text: 'Final answer', sortIndex: 5 }
];
var toolGroups = api.buildQaGroups(toolTurns);
assertEqual(toolGroups.length, 2, 'consecutive assistant messages should merge into the same group');
assertEqual(toolGroups[0].assistantTurns.length, 2, 'merged group should contain both assistant responses');
assertEqual(toolGroups[0].summary, 'Run this for me', 'merged group should use user turn for summary');
```

- [ ] **Step 2: Add test for render skip logic**

```javascript
var renderState = api.createState();
renderState.groups = api.buildQaGroups(apiTurns);
renderState.activeGroupId = renderState.groups[0].id;
renderState.ui.panel = document.createElement('aside');
renderState.ui.panel.id = 'tl-chat-timeline';
document.body.appendChild(renderState.ui.panel);
api.renderTimeline(renderState, { jumpToGroup: function() {} });
var firstMarkerCount = renderState.ui.panel.querySelectorAll('.tl-timeline-marker').length;
// Re-render with same data should produce same output (no duplicate DOM)
api.renderTimeline(renderState, { jumpToGroup: function() {} });
var secondMarkerCount = renderState.ui.panel.querySelectorAll('.tl-timeline-marker').length;
assertEqual(firstMarkerCount, secondMarkerCount, 're-render with unchanged data should not duplicate markers');
renderState.ui.panel.remove();
```

- [ ] **Step 3: Add test for export markdown code block preservation**

```javascript
var codeTurns = [
  { id: 'code-u', role: 'u', text: 'Write a function', sortIndex: 1 },
  { id: 'code-a', role: 'a', text: 'Here is the code:\n```python\ndef hello():\n    print("hello")\n```', sortIndex: 2 }
];
var codeGroups = api.buildQaGroups(codeTurns);
var md = api.formatConversationMarkdown(codeGroups, { title: 'Test', includeUser: true, includeAssistant: true });
assertMatch(md, /```python/, 'Markdown export should preserve code block fences');
assertMatch(md, /def hello/, 'Markdown export should preserve code content');
assertMatch(md, /print\("hello"\)/, 'Markdown export should preserve code strings');
```

- [ ] **Step 4: Run full test suite**

Open `content-script.test.html` in Chrome. Confirm "PASS" is displayed.

- [ ] **Step 5: Commit**

```bash
git add content-script.test.html
git commit -m "test: add assertions for consecutive assistant grouping, render idempotency, and export code preservation"
```

---

## Verification Checklist

Before declaring the work complete, verify:

1. **Freeze fix**: Load extension on a conversation with 20+ turns. During streaming, the timeline rail and hover preview should remain responsive (clickable/scroable).
2. **Consecutive assistant**: Navigate to a conversation with tool calls (code interpreter, browsing). Verify the markers show only meaningful question groups, not fragmented tool outputs.
3. **Preview scroll**: Hover the rail, scroll the preview list, wait for data refresh — scroll position should stay where the user left it.
4. **Markdown export**: Export a conversation with code blocks. Open the `.md` file in a Markdown previewer — code blocks should render correctly.
5. **PDF export**: Click "导出 PDF" — the print preview should show professional formatting with proper margins and page breaks.
6. **UI consistency**: In both light and dark mode, verify the accent colors are harmonious, border-radius matches across rail and card, and the toolbar is not cramped.
7. **All tests pass**: Open `content-script.test.html` and confirm "PASS".
