# DeepSeek Voyager Timeline UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 将 ChatGPT Timeline 扩展的右侧时间轴改成接近截图中 DeepSeek 网页时间轴的窄浮层列表，兼容黑色模式，白天模式使用粉色强调，并移除导出功能、保留并优化排版宽度控制。

**Architecture:** 保持现有 MV3 content-script 架构和 IIFE 模块注册方式，不引入构建工具或新依赖。UI 仍由 `src/ui/timeline.js` 生成 DOM、`src/ui/styles.js` 注入样式，`src/content-main.js` 只负责数据流和 actions。删除导出功能时从 manifest、运行时 action、测试页加载和文档同时收口，避免留下不可达入口。

**Tech Stack:** Chrome MV3, plain JavaScript IIFEs, injected CSS, `content-script.test.html` browser assertions, PowerShell checks, Chrome/Playwright visual smoke test.

---

## Current Worktree Context

当前工作区已有一版实现草案：

- `src/ui/timeline.js` 已渲染 `.tl-preview-controls`、`.tl-hover-list`、`.tl-hover-row`，并删除了 hover card 中的导出按钮和选择模式。
- `src/ui/styles.js` 已设置粉色/蓝色/绿色 token，hover card 宽度约 `300px-360px`，行高约 `37px`。
- `manifest.json` 已不再加载 `src/features/export.js`。
- `src/features/export.js` 当前已删除。
- `content-script.test.html` 已移除导出 formatter 断言，并新增紧凑浮层和无导出入口断言。

实现计划下面仍按从干净基线执行来写，方便后续检查当前改动是否完整。

## File Structure

- Modify: `manifest.json`  
  负责 content script 加载顺序；从这里移除导出模块加载。

- Modify: `src/content-main.js`  
  负责主流程、路由、数据刷新、timeline actions；删除 export feature 依赖、导出 helper、`actions.exportConversation` 和测试 API 暴露。

- Delete: `src/features/export.js`  
  导出功能实现文件；删除后必须确认没有任何 manifest/test/runtime 引用。

- Modify: `src/ui/timeline.js`  
  负责 rail、hover card、搜索、虚拟列表、排版菜单 DOM；改成 DeepSeek/Voyager 风格的紧凑列表，不渲染导出 toolbar、role checkbox、row selector。

- Modify: `src/ui/styles.js`  
  负责注入 CSS；实现黑色模式兼容、白天粉色强调、窄浮层、右对齐标题、短横 marker、排版菜单样式。

- Modify: `content-script.test.html`  
  负责无框架 browser assertions；删除导出测试，新增无导出入口、黑白主题 token、紧凑列表、长对话虚拟滚动、排版菜单断言。

- Modify: `README.md`  
  删除导出功能描述，更新 DeepSeek/Voyager 风格、黑色模式、白天粉色、排版控制说明。

- Optional Modify: `packages/chatgpt-timeline-extension-v2.00.zip`  
  只有需要重新发布 zip 包时才更新；普通 UI 迭代可先不改发布包。

---

### Task 1: Lock Visual Requirements And Current Baseline

**Files:**
- Inspect: `src/ui/timeline.js`
- Inspect: `src/ui/styles.js`
- Inspect: `content-script.test.html`
- Inspect: provided screenshot `C:/Users/Admin/AppData/Local/Temp/codex-clipboard-68ae52bc-14f3-4e49-9a78-17e852f13959.png`

- [x] **Step 1: Record target UI behavior**

Target behavior:

- Collapsed state remains a narrow right rail.
- Hover state opens a compact dark/light compatible card to the left of the rail.
- Card resembles DeepSeek screenshot: rounded dark surface, right-aligned conversation titles, short horizontal tick marks on the right, active row brighter/bolder.
- White/day mode primary accent is pink.
- Dark mode keeps readable contrast and does not use low-contrast pink text everywhere.
- Export controls are gone.
- Search and layout width controls remain available but compact.

- [x] **Step 2: Capture current baseline diff**

Run:

```powershell
git status --short
git diff -- src/ui/timeline.js src/ui/styles.js src/content-main.js manifest.json content-script.test.html README.md
```

Expected:

- Only task-related files show timeline/export/doc/test changes.
- Any unrelated dirty files such as `CLAUDE.md`, package zips, or stray untracked files are noted and not touched.

- [x] **Step 3: Confirm no CodeGraph dependency is required**

Run only if structural lookup is needed:

```powershell
# CodeGraph may be uninitialized in this repo; native reads are acceptable for this small UI plan.
```

Expected:

- Do not initialize CodeGraph unless the user asks.

---

### Task 2: Remove Export Functionality End To End

**Files:**
- Modify: `manifest.json`
- Modify: `src/content-main.js`
- Delete: `src/features/export.js`
- Modify: `content-script.test.html`
- Modify: `README.md`

- [x] **Step 1: Remove export script from manifest**

In `manifest.json`, remove this entry from `content_scripts[0].js`:

```json
"src/features/export.js"
```

Expected list ending:

```json
"src/ui/virtual-list.js",
"src/ui/timeline.js",
"src/content-main.js"
```

- [x] **Step 2: Remove export dependency from content main**

In `src/content-main.js`, remove:

```js
const exportFeature = ns.exportFeature;
```

Remove helper functions:

```js
getExportTitle()
buildExportOptions(options)
exportMarkdown(options)
exportPdf(options)
```

Remove action:

```js
exportConversation: function(format, options) { ... }
```

Remove test API exports:

```js
formatConversationMarkdown
formatConversationPrintHtml
formatConversationJson
buildExportFilename
```

- [x] **Step 3: Delete export implementation file**

Delete:

```text
src/features/export.js
```

- [x] **Step 4: Update tests to assert export is gone**

In `content-script.test.html`:

Remove script tag:

```html
<script src="./src/features/export.js"></script>
```

Remove formatter tests for `formatConversationMarkdown`, `formatConversationJson`, `formatConversationPrintHtml`, and `buildExportFilename`.

Add hover UI assertions:

```js
assertEqual(uiState.ui.panel.querySelector('.tl-export-toolbar') === null, true, 'hover preview should not render the removed export toolbar');
assertEqual(uiState.ui.panel.querySelector('.tl-export-md') === null, true, 'hover preview should not render Markdown export');
assertEqual(uiState.ui.panel.querySelector('.tl-export-pdf') === null, true, 'hover preview should not render PDF export');
assertEqual(uiState.ui.panel.querySelectorAll('.tl-row-select').length, 0, 'hover preview should not render export row selectors');
```

- [x] **Step 5: Verify no runtime export references remain**

Run:

```powershell
rg -n "exportFeature|exportConversation|formatConversation|buildExport|downloadText|src/features/export|tl-export|tl-row-select" src manifest.json content-script.test.html README.md
```

Expected:

- No matches in runtime files.
- Test matches are allowed only when asserting removed selectors are absent.

---

### Task 3: Rebuild Hover Timeline As DeepSeek-Style Compact Card

**Files:**
- Modify: `src/ui/timeline.js`
- Modify: `src/ui/styles.js`
- Test: `content-script.test.html`

- [x] **Step 1: Replace report header/export toolbar with compact controls**

In `src/ui/timeline.js`, make `renderHoverPreview` call only:

```js
renderPreviewControls(card, state, actions);
renderPreviewList(card, state, actions, previewItems, activeId);
```

Do not call:

```js
renderReportHeader(...)
ensureSelectedExportGroups(...)
renderExportToolbar(...)
```

- [x] **Step 2: Render compact controls**

Add/keep:

```js
function renderPreviewControls(card, state, actions) {
  const toolbar = utils.createElement('div', 'tl-preview-controls');
  const searchWrap = utils.createElement('div', 'tl-search-wrap');

  toolbar.addEventListener('click', function(event) {
    event.stopPropagation();
  });

  searchWrap.appendChild(renderSearchInput(state, actions));
  toolbar.appendChild(searchWrap);
  toolbar.appendChild(renderLayoutControl(state, actions));
  card.appendChild(toolbar);
}
```

- [x] **Step 3: Simplify preview row DOM**

Use a single title plus CSS-generated right tick:

```js
function renderPreviewRow(state, actions, item) {
  const row = utils.createElement('div', 'tl-hover-row' + (item.active ? ' active' : ''));
  const titleButton = utils.createElement('button', 'tl-hover-title-button');
  const body = utils.createElement('span', 'tl-hover-body');
  const title = utils.createElement('span', 'tl-hover-title', item.title);

  row.title = (item.index + 1) + '/' + state.groups.length + ' ' + item.group.summary;
  row.setAttribute('data-tl-group-id', item.id);
  row.style.height = PREVIEW_ROW_HEIGHT + 'px';
  row.style.setProperty('--tl-accent', getAccentColor(item.index));
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
```

- [x] **Step 4: Set compact row/list constants**

In `src/ui/timeline.js`:

```js
const PREVIEW_ROW_HEIGHT = 37;
const PREVIEW_VIEWPORT_HEIGHT = 333;
const REPORT_ACCENTS = ['#ec6aa5', '#8ccdf7', '#8ee6c1', '#f19ac2', '#9fd8ff', '#9df0d0'];
```

- [x] **Step 5: Style card width and dark/light theme tokens**

In `src/ui/styles.js`, keep values close to screenshot:

```css
:root{
  --tl-preview-width:min(clamp(300px,32vw,360px), calc(100vw - 76px));
  --tl-pink:#ec6aa5;
  --tl-blue:#8ccdf7;
  --tl-green:#8ee6c1;
  --tl-row-active-bg:#fff0f7;
  --tl-active-text:var(--tl-pink);
  --tl-marker-active:var(--tl-pink);
}
html.dark{
  --tl-pink:#f19ac2;
  --tl-blue:#9fd8ff;
  --tl-green:#9df0d0;
  --tl-preview-bg:#24242b;
  --tl-preview-surface:#2b2b33;
  --tl-row-active-bg:rgba(241,154,194,.18);
  --tl-active-text:#f8fafc;
  --tl-marker-active:#f8fafc;
}
```

- [x] **Step 6: Style rows like screenshot**

In `src/ui/styles.js`:

```css
.tl-hover-row{
  min-height:37px;
  height:37px;
  padding:0 12px 0 18px;
  color:var(--tl-preview-muted);
}
.tl-hover-title-button{
  display:grid;
  grid-template-columns:minmax(0,1fr) 14px;
  min-height:37px;
}
.tl-hover-title-button::after{
  content:"";
  width:9px;
  height:2px;
  border-radius:999px;
  background:currentColor;
  opacity:.36;
}
.tl-hover-title{
  display:block;
  overflow:hidden;
  white-space:nowrap;
  text-overflow:ellipsis;
  text-align:right;
}
.tl-hover-row.active{
  color:var(--tl-active-text);
  font-weight:650;
  background:var(--tl-row-active-bg);
}
```

- [x] **Step 7: Add tests for compact card styling**

In `content-script.test.html`, assert:

```js
assertMatch(styleText, /--tl-preview-width:min(clamp(300px,32vw,360px)/, 'hover preview should use the screenshot-sized width');
assertMatch(styleText, /max-height:min(376px/, 'hover preview card should use the screenshot-height cap');
assertMatch(styleText, /.tl-hover-list{[sS]*max-height:333px/, 'hover preview list should use the screenshot-height list cap');
assertEqual(Number.parseFloat(window.getComputedStyle(uiState.ui.panel.querySelector('.tl-hover-row')).height), 37, 'compact preview rows should use the screenshot-style row height');
assertEqual(window.getComputedStyle(uiState.ui.panel.querySelector('.tl-hover-title')).textAlign, 'right', 'compact preview row titles should align toward the marker rail');
```

---

### Task 4: Keep And Improve Layout Width Control

**Files:**
- Modify: `src/ui/timeline.js`
- Modify: `src/ui/styles.js`
- Test: `content-script.test.html`

- [x] **Step 1: Keep existing layout modes**

Do not change layout preference contract:

```js
{ id: 'default', label: '默认' }
{ id: 'comfortable', label: '舒适' }
{ id: 'wide', label: '宽屏' }
{ id: 'full', label: '全宽' }
```

- [x] **Step 2: Render trigger with active label**

In `src/ui/timeline.js`:

```js
function getLayoutLabel(mode) {
  if (mode === 'default') return '默认';
  if (mode === 'comfortable') return '舒适';
  if (mode === 'full') return '全宽';
  return '宽屏';
}
```

Use:

```js
const activeMode = getLayoutMode(state);
const button = utils.createElement('button', 'tl-layout-trigger', getLayoutLabel(activeMode));
```

- [x] **Step 3: Verify menu action still applies layout immediately**

In `content-script.test.html` keep/assert:

```js
uiState.ui.panel.querySelector('.tl-layout-trigger').click();
assertEqual(uiState.ui.panel.querySelectorAll('.tl-layout-option').length, 4, 'layout menu should render four width options');
uiState.ui.panel.querySelector('[data-tl-layout-mode="default"]').click();
assertEqual(uiState.prefs.layoutMode, 'default', 'clicking a width option should update layout preference');
assertEqual(document.body.classList.contains('tl-layout-default'), true, 'clicking a width option should apply layout immediately');
```

- [x] **Step 4: Check compact controls do not overlap**

In `content-script.test.html`:

```js
const controlsRect = uiState.ui.panel.querySelector('.tl-preview-controls').getBoundingClientRect();
const searchRect = uiState.ui.panel.querySelector('.tl-search-wrap').getBoundingClientRect();
const layoutRect = uiState.ui.panel.querySelector('.tl-layout-trigger').getBoundingClientRect();
assertEqual(searchRect.right <= layoutRect.left || searchRect.bottom <= layoutRect.top || layoutRect.bottom <= searchRect.top, true, 'compact controls should not overlap');
assertEqual(searchRect.width < controlsRect.width, true, 'search and layout controls should share one compact row');
```

---

### Task 5: Preserve Long Conversation Behavior

**Files:**
- Modify: `src/ui/timeline.js` only if tests fail
- Test: `content-script.test.html`

- [x] **Step 1: Keep virtual list behavior**

Do not remove:

```js
buildPreviewWindow(itemCount, scrollTop)
patchPreviewList(list, state, actions, previewItems, activeId)
PREVIEW_FULL_RENDER_LIMIT
PREVIEW_OVERSCAN
```

- [x] **Step 2: Update scroll delta for row height**

In long-list tests, replace old row-height scroll deltas with:

```js
hugeListBeforeScroll.scrollTop = hugeListBeforeScroll.scrollTop + 37;
```

- [x] **Step 3: Keep blank rail click behavior**

Retain this expected behavior:

```js
hugeRail.dispatchEvent(new MouseEvent('click', { bubbles: true, clientY: 300 }));
assertEqual(hugeRailJumpedId, hugeGroups[150].id, 'clicking an empty rail position should jump to the nearest conversation group by vertical ratio');
```

---

### Task 6: Update Documentation And Optional Package Artifact

**Files:**
- Modify: `README.md`
- Optional Modify: `packages/chatgpt-timeline-extension-v2.00.zip`

- [x] **Step 1: Remove export feature docs**

Delete bullets that say Markdown/PDF export is supported.

- [x] **Step 2: Add new UI summary**

Use wording like:

```markdown
- Refreshes the hover timeline into a compact DeepSeek/Voyager-style index with a narrow card, right-aligned titles, and pink daytime accents.
- Keeps dark mode readable while using pink as the light-mode accent.
```

Chinese section:

```markdown
- 悬浮时间轴改成更接近 Voyager / DeepSeek 的紧凑索引：窄浮层、右对齐标题、短横 marker，并在白天模式使用粉色强调。
- 黑色模式保持高对比可读性，白天模式使用粉色作为主强调色。
```

- [x] **Step 3: Decide whether to rebuild zip**

If this is a release-ready change, rebuild `packages/chatgpt-timeline-extension-v2.00.zip` from the current extension files. If not release-ready, leave the zip alone and document that it is stale.

Expected decision:

- For local UI iteration: do not update zip.
- For this completion pass: rebuild the existing package zip because it was already dirty and still contained `src/features/export.js`; verify the rebuilt zip omits that file.

---

### Task 7: Verification

**Files:**
- Test: `content-script.test.html`
- Test: `manifest.json`
- Test: `src/ui/timeline.js`
- Test: `src/ui/styles.js`
- Test: `src/content-main.js`

- [x] **Step 1: Parse manifest**

Run:

```powershell
Get-Content -LiteralPath '.\manifest.json' -Raw | ConvertFrom-Json | Out-Null; 'manifest ok'
```

Expected:

```text
manifest ok
```

- [x] **Step 2: Check JavaScript syntax**

Run:

```powershell
node --check '.\src\ui\timeline.js'
node --check '.\src\ui\styles.js'
node --check '.\src\content-main.js'
```

Expected:

- Exit code 0.
- No syntax output.

- [x] **Step 3: Check whitespace/conflict markers**

Run:

```powershell
git diff --check
```

Expected:

- Exit code 0.
- LF/CRLF warnings are acceptable if no whitespace errors or conflict markers are reported.

- [x] **Step 4: Run browser assertions**

Preferred local command via Chrome + Playwright:

```js
const { chromium } = await import('playwright');
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' });
await page.goto('file:///D:/Code/chatgpt-timeline-extension/content-script.test.html');
await page.waitForFunction(() => document.getElementById('output') && document.getElementById('output').textContent !== 'RUNNING');
console.log(await page.locator('#output').textContent());
await browser.close();
```

Expected:

```text
PASS
```

- [x] **Step 5: Visual smoke check**

Use either local Chrome screenshot or manual extension load:

- Load unpacked extension from `D:\Code\chatgpt-timeline-extension`.
- Open a long ChatGPT conversation.
- Hover the right rail.
- Confirm the hover card matches screenshot direction: dark compatible surface, right-aligned titles, short ticks, active item highlighted, no export buttons.
- Switch ChatGPT/light theme or force light mode and confirm white/day mode uses pink accent.

---

### Task 8: Final Cleanup

**Files:**
- Inspect: all dirty files

- [x] **Step 1: Separate task changes from unrelated dirty files**

Run:

```powershell
git status --short
```

Expected task files:

```text
M README.md
M content-script.test.html
M manifest.json
M src/content-main.js
D src/features/export.js
M src/ui/styles.js
M src/ui/timeline.js
```

Unrelated existing dirty files should not be reverted unless the user asks.

- [x] **Step 2: Prepare optional commit**

Only if user asks to commit:

```powershell
git add README.md content-script.test.html manifest.json src/content-main.js src/features/export.js src/ui/styles.js src/ui/timeline.js
git commit -m "feat: restyle timeline and remove exports"
```

- [x] **Step 3: Report verification evidence**

Final report should include:

- Files changed.
- Export removal status.
- Browser test result.
- Any skipped visual/manual checks.
- Any unrelated dirty files left untouched.


---

## Execution Result

Completed on 2026-06-23 in the existing working tree.

Evidence:

- `manifest.json` no longer loads `src/features/export.js`.
- `src/features/export.js` is deleted from the source tree.
- Runtime export hooks were removed from `src/content-main.js`.
- Hover preview now renders compact `.tl-preview-controls` plus a DeepSeek/Voyager-style right-aligned timeline list.
- Light mode active timeline text uses pink via `--tl-active-text:var(--tl-pink)`.
- Dark mode active timeline text uses white via `--tl-active-text:#f8fafc`.
- `packages/chatgpt-timeline-extension-v2.00.zip` was rebuilt and verified to omit `src/features/export.js`.
- Verification run: manifest parse passed, `node --check` passed for the changed JS files, `git diff --check` reported no whitespace errors, browser test page returned `PASS`, visual smoke screenshots confirmed dark and light timeline metrics.

Not executed:

- Git commit was not created because the user did not request a commit.
