# Timeline UI and Performance Update

Date: 2026-04-28
Version: v2.00

This v2.00 update improves the ChatGPT Timeline Navigator hover preview for real long conversations. It focuses on three practical issues: matching the compact screenshot-style hover card, keeping the collapsed rail visually short, and fixing the 19+ conversation freeze where the preview list could become hard to scroll or click.

## What Changed

- The hover preview is now a compact DeepSeek/Voyager-style index card.
- The card uses a dark `#202020` surface, `#343434` border, 302px max width, 224px list height, and 42px rows.
- Active rows and markers use `#6ea0ff`; inactive markers use muted gray.
- The old search/filter/export toolbar is not rendered in this screenshot-style card.
- The collapsed rail samples up to five short horizontal marker ticks instead of rendering every group as a full-height rail.
- Medium-length conversations, including 19-row previews, use native browser scrolling.
- Very long conversations use a virtual list window to keep rendered DOM small.
- Preview list scrolling no longer rebuilds the entire hover card.
- Timeline-owned DOM mutations are ignored by the conversation observer.
- Streaming assistant text no longer triggers refresh through `characterData` mutation events.

## Why It Matters

Before this update, scrolling the hover preview could call the full timeline render path. That full render destroyed and rebuilt the panel, toolbar, card, and list. In longer conversations this made the scroll position unstable, interrupted clicks, and could make lower rows such as item 19 difficult to select.

The new behavior keeps the outer UI stable. The right-side rail, hover card, and list container stay in place. Only the visible list window is patched when a long list scrolls.

## User-Facing Behavior

- The right-side marker rail stays fixed at the page edge.
- Hovering the rail opens the conversation index card.
- The preview card stays narrow and dark, with one-line truncated titles and short right-side ticks.
- Active rows and markers use the screenshot blue accent.
- The old search, role filtering, selection mode, width control, Markdown export, and PDF export controls are intentionally absent from the hover card.
- Clicking a row title jumps to the matching conversation group.
- A 19-row conversation preview can be scrolled to the bottom and the 19th item remains clickable.

## Implementation Notes

- `src/ui/timeline.js` separates rail rendering, hover preview rendering, marker sampling, and preview list patching.
- `src/ui/virtual-list.js` provides the virtual window calculation used for very long previews.
- `src/ui/styles.js` defines the compact dark card, blue/gray marker colors, short rail geometry, hidden scrollbars, and 42px row layout.
- `src/content-main.js` removes `characterData` observation for the conversation observer and filters timeline-owned mutations.
- `content-script.test.html` includes regression coverage for the screenshot palette and dimensions, 19-row scroll/click behavior, 300-row virtual rendering, rail click mapping, formula copy, popup layout messaging, and observer configuration.

## Validation

Validated locally with:

```powershell
Get-Content manifest.json | ConvertFrom-Json
git diff --check
```

Validated in Chrome headless:

```powershell
& 'C:\Program Files\Google\Chrome\Application\chrome.exe' --headless --disable-extensions --disable-component-extensions-with-background-pages --disable-gpu --no-sandbox --run-all-compositor-stages-before-draw --virtual-time-budget=30000 --dump-dom 'file:///D:/Code/chatgpt-timeline-extension/content-script.test.html'
```

Expected output:

```text
<pre id="output">PASS</pre>
```

`node --check` is not used as a release gate on this machine because the local Node runtime currently fails during startup with:

```text
Assertion failed: ncrypto::CSPRNG(nullptr, 0)
```

That failure happens before project code is parsed.

---

# 时间线 UI 与性能更新

日期：2026-04-28
版本：v2.00

本次 v2.00 更新主要优化 ChatGPT Timeline Navigator 在真实长对话中的悬浮预览体验，重点解决三个问题：对齐当前截图风格的紧凑 hover 卡片、让折叠 rail 保持短节点栈，以及 19 条以上对话时预览列表滚动、点击变卡的问题。

## 更新内容

- 悬浮预览改为 DeepSeek / Voyager 风格的紧凑索引卡片。
- 卡片使用 `#202020` 深色背景、`#343434` 边框、302px 最大宽度、224px 列表高度和 42px 行高。
- 当前行和 marker 使用 `#6ea0ff` 蓝色强调，普通 marker 使用灰色。
- 旧的搜索、筛选、导出工具栏不再渲染在当前截图风格卡片中。
- 折叠 rail 最多采样 5 个短横 marker，不再把所有 group 渲染成长 rail。
- 19 条左右的中等长度对话使用浏览器原生滚动。
- 超长对话使用虚拟列表窗口，减少实际渲染的 DOM 行数。
- 预览列表滚动不再重建整个 hover card。
- conversation observer 会忽略时间线自身 DOM 变化。
- assistant 流式文本变化不再通过 `characterData` mutation 触发刷新。

## 改进原因

此前 hover 预览列表滚动可能进入完整时间线渲染路径。完整渲染会销毁并重建面板、工具栏、卡片和列表。长对话中这会导致滚动位置不稳定、点击被打断，甚至出现第 19 条附近无法稳定点击的问题。

新实现会保持外层 UI 稳定。右侧 rail、hover card 和列表容器都不会因为列表滚动被重建。长列表滚动时只更新可见列表窗口。

## 用户可见效果

- 右侧 marker rail 始终固定在页面右侧。
- 鼠标悬浮 rail 后打开对话目录卡片。
- 预览卡片保持深色窄浮层、单行标题和右侧短横提示。
- active 行和 marker 使用截图中的蓝色强调。
- 旧搜索、角色筛选、选择模式、宽度控制、Markdown 导出、PDF 导出控件不再出现在 hover 卡片里。
- 点击行标题会跳转到对应对话组。
- 19 条对话预览可以滚动到底部，并且第 19 条仍可点击。

## 实现说明

- `src/ui/timeline.js` 拆分 rail、hover preview、marker 采样和 preview list 的渲染更新。
- `src/ui/virtual-list.js` 提供超长预览列表的窗口计算。
- `src/ui/styles.js` 定义紧凑深色卡片、蓝/灰 marker、短 rail 几何、隐藏滚动条和 42px 行布局。
- `src/content-main.js` 移除 conversation observer 的 `characterData` 监听，并过滤时间线自身 DOM 变化。
- `content-script.test.html` 覆盖截图配色和尺寸、19 条滚动点击、300 条虚拟列表、rail 空白点击映射、公式复制、popup 宽度消息和 observer 配置回归测试。

## 验证记录

本地验证：

```powershell
Get-Content manifest.json | ConvertFrom-Json
git diff --check
```

Chrome headless 验证：

```powershell
& 'C:\Program Files\Google\Chrome\Application\chrome.exe' --headless --disable-extensions --disable-component-extensions-with-background-pages --disable-gpu --no-sandbox --run-all-compositor-stages-before-draw --virtual-time-budget=30000 --dump-dom 'file:///D:/Code/chatgpt-timeline-extension/content-script.test.html'
```

预期输出：

```text
<pre id="output">PASS</pre>
```

`node --check` 没有作为本机 release gate，因为当前机器的 Node runtime 会在启动阶段失败：

```text
Assertion failed: ncrypto::CSPRNG(nullptr, 0)
```

该错误发生在项目代码解析之前。
