# Timeline UI and Performance Update

Date: 2026-04-28

This update improves the ChatGPT Timeline Navigator hover preview for real long conversations. It focuses on two practical issues: toolbar alignment and the 19+ conversation freeze where the preview list could become hard to scroll or click.

## What Changed

- The hover toolbar now uses a stable two-row layout.
- The search input occupies the first row.
- Role filters and action buttons share the second row.
- `导出 MD` and `导出 PDF` remain visible and action-oriented.
- Medium-length conversations, including 19-row previews, use native browser scrolling.
- Very long conversations use a virtual list window to keep rendered DOM small.
- Preview list scrolling no longer rebuilds the entire hover card.
- Timeline-owned DOM mutations are ignored by the conversation observer.
- Streaming assistant text no longer triggers refresh through `characterData` mutation events.

## Why It Matters

Before this update, scrolling the hover preview could call the full timeline render path. That full render destroyed and rebuilt the panel, toolbar, card, and list. In longer conversations this made the scroll position unstable, interrupted clicks, and could make lower rows such as item 19 difficult to select.

The new behavior keeps the outer UI stable. The right-side rail, hover card, header, toolbar, and list container stay in place. Only the visible list window is patched when a long list scrolls.

## User-Facing Behavior

- The right-side marker rail stays fixed at the page edge.
- Hovering the rail opens the conversation index card.
- The toolbar aligns cleanly in two rows on desktop.
- Search, role filtering, selection mode, width control, Markdown export, and PDF export remain available.
- Clicking a row title jumps to the matching conversation group.
- Checkbox clicks only change export selection and do not trigger row navigation.
- A 19-row conversation preview can be scrolled to the bottom and the 19th item remains clickable.

## Implementation Notes

- `src/ui/timeline.js` separates rail rendering, hover preview rendering, toolbar rendering, and preview list patching.
- `src/ui/virtual-list.js` provides the virtual window calculation used for very long previews.
- `src/ui/styles.js` defines the two-row toolbar layout and tighter, more consistent controls.
- `src/content-main.js` removes `characterData` observation for the conversation observer and filters timeline-owned mutations.
- `content-script.test.html` includes regression coverage for toolbar layout, 19-row scroll/click behavior, 300-row virtual rendering, and observer configuration.

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

本次更新主要优化 ChatGPT Timeline Navigator 在真实长对话中的悬浮预览体验，重点解决两个问题：顶部工具栏对齐，以及 19 条以上对话时预览列表滚动、点击变卡的问题。

## 更新内容

- 悬浮工具栏改为稳定两行布局。
- 搜索框独占第一行。
- 角色筛选和操作按钮共用第二行。
- `导出 MD` 和 `导出 PDF` 保持清晰的动作型文案。
- 19 条左右的中等长度对话使用浏览器原生滚动。
- 超长对话使用虚拟列表窗口，减少实际渲染的 DOM 行数。
- 预览列表滚动不再重建整个 hover card。
- conversation observer 会忽略时间线自身 DOM 变化。
- assistant 流式文本变化不再通过 `characterData` mutation 触发刷新。

## 改进原因

此前 hover 预览列表滚动可能进入完整时间线渲染路径。完整渲染会销毁并重建面板、工具栏、卡片和列表。长对话中这会导致滚动位置不稳定、点击被打断，甚至出现第 19 条附近无法稳定点击的问题。

新实现会保持外层 UI 稳定。右侧 rail、hover card、标题区、工具栏和列表容器都不会因为列表滚动被重建。长列表滚动时只更新可见列表窗口。

## 用户可见效果

- 右侧 marker rail 始终固定在页面右侧。
- 鼠标悬浮 rail 后打开对话目录卡片。
- 桌面端工具栏稳定两行对齐。
- 搜索、角色筛选、选择模式、宽度控制、Markdown 导出、PDF 导出继续保留。
- 点击行标题会跳转到对应对话组。
- 点击 checkbox 只改变导出选择，不触发行跳转。
- 19 条对话预览可以滚动到底部，并且第 19 条仍可点击。

## 实现说明

- `src/ui/timeline.js` 拆分 rail、hover preview、toolbar、preview list 的渲染和更新。
- `src/ui/virtual-list.js` 提供超长预览列表的窗口计算。
- `src/ui/styles.js` 定义两行 toolbar 布局和更统一的控件样式。
- `src/content-main.js` 移除 conversation observer 的 `characterData` 监听，并过滤时间线自身 DOM 变化。
- `content-script.test.html` 覆盖 toolbar 布局、19 条滚动点击、300 条虚拟列表和 observer 配置回归测试。

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
