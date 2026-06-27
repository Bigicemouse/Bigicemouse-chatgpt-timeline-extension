# ChatGPT Timeline Navigator

English | [中文](#chatgpt-时间线导航器)

A Chrome/Edge MV3 extension that adds a fixed right-side timeline to ChatGPT conversations.

Current version: **v2.00**

## Features

- Fetches complete ChatGPT conversation mappings through ChatGPT backend APIs.
- Captures ChatGPT bearer tokens in the background service worker for authenticated API reads.
- Falls back to rendered DOM collection when the API is unavailable.
- Shows a minimal fixed right-side rail with clickable timeline markers.
- Expands a scrollable hover preview with all question groups for long conversations.
- Adjustable reading width (600px-1600px) via popup slider.
- LaTeX formula click-to-copy from KaTeX/MathJax elements.

## Latest Update

Version **v2.00** focuses on a compact screenshot-matched hover card and a smoother long-conversation timeline:

- Refreshes the hover timeline into a compact DeepSeek/Voyager-style index with a 302px dark card, one-line titles, and short blue/gray markers.
- Fixes the 19+ conversation preview freeze by avoiding full card rebuilds during list scroll.
- Uses native scrolling for medium-length previews and a virtual list window for very long conversations.
- Reduces streaming refresh pressure by ignoring `characterData` mutations and timeline-owned DOM updates.
- Keeps the collapsed rail short by sampling up to five marker ticks instead of rendering a full-height scrollbar-like rail.
- New popup UI with toggle switches for reading width and formula copy features.
- Adjustable reading width slider (600px-1600px) with real-time preview.

Read the full update note: [Timeline UI and Performance Update](docs/2026-04-28-timeline-ui-performance-update.md).

## Install

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable developer mode.
3. Choose `Load unpacked`.
4. Select this repository folder.

## Test

Open `content-script.test.html` in a browser. The page displays `PASS` when the local assertions pass.

There is no build step and no package manager dependency.

## Package

The packaged extension zip is published as:

```text
packages/chatgpt-timeline-extension-v2.00.zip
```

Use it as a release asset or extract it and load the extracted folder as an unpacked browser extension.

## Project Structure

- `manifest.json` - MV3 extension manifest.
- `src/background/token-capture.js` - background bearer token capture.
- `src/data/conversation-api.js` - conversation API fetch and mapping parsing.
- `src/ui/timeline.js` - fixed rail and hover preview rendering.
- `src/ui/styles.js` - injected timeline styles.
- `src/ui/layout.js` - reading width layout control.
- `src/features/formula-copy.js` - LaTeX formula click-to-copy.
- `src/popup/popup.js` - popup settings UI.
- `src/content-main.js` - content script orchestrator.

---

# ChatGPT 时间线导航器

[English](#chatgpt-timeline-navigator) | 中文

这是一个 Chrome/Edge MV3 扩展，用于给 ChatGPT 对话添加固定在右侧的时间线导航。

当前版本：**v2.00**

## 功能

- 通过 ChatGPT 后端 API 获取完整对话 mapping，减少长对话只读取已渲染 DOM 的问题。
- 后台 service worker 捕获 ChatGPT 请求里的 Bearer token，用于带认证读取完整对话。
- 当 API 不可用时，仍保留页面 DOM 读取作为降级方案。
- 右侧固定极简时间线轨道，支持点击 marker 跳转到对应问题。
- 鼠标悬浮时展开可滚动预览卡片，长对话会显示全部问题组。
- 可调整阅读宽度（600px-1600px），通过弹窗滑块控制。
- LaTeX 公式点击复制，支持 KaTeX 和 MathJax 元素。

## 最新更新

**v2.00** 更新重点收尾当前截图风格的悬浮卡片，并解决长对话时间线卡顿：

- 悬浮时间轴改成更接近 DeepSeek / Voyager 的紧凑索引：302px 深色窄浮层、单行标题、蓝/灰短横 marker。
- 修复 19 条以上对话预览滚动时卡住、无法点击第 19 行的问题。
- 中等长度对话使用原生滚动，超长对话才启用虚拟列表窗口，减少 DOM 节点。
- MutationObserver 不再监听 `characterData`，并忽略时间线自身 DOM 更新，降低流式输出期间的刷新压力。
- 右侧折叠 rail 保持短节点栈，最多采样 5 个 marker，避免变成长滚动条样式。
- 弹窗 UI 改为开关控制，支持阅读宽度和公式复制功能的独立开关。
- 阅读宽度滑块（600px-1600px）支持实时预览。

完整更新说明：[Timeline UI and Performance Update](docs/2026-04-28-timeline-ui-performance-update.md)。

## 安装

1. 打开 `chrome://extensions` 或 `edge://extensions`。
2. 开启开发者模式。
3. 点击 `加载已解压的扩展程序`。
4. 选择本仓库目录。

## 测试

用浏览器打开 `content-script.test.html`。页面显示 `PASS` 表示本地断言通过。

本项目没有构建步骤，也不依赖 npm/package.json。

## 发布包

扩展 zip 包发布在：

```text
packages/chatgpt-timeline-extension-v2.00.zip
```

可以把它作为 GitHub Release 附件使用，也可以解压后按"加载已解压的扩展程序"的方式安装。

## 项目结构

- `manifest.json` - MV3 扩展清单。
- `src/background/token-capture.js` - 后台 Bearer token 捕获。
- `src/data/conversation-api.js` - 对话 API 请求和 mapping 解析。
- `src/ui/timeline.js` - 右侧轨道和悬浮预览渲染。
- `src/ui/styles.js` - 注入式时间线样式。
- `src/ui/layout.js` - 阅读宽度布局控制。
- `src/features/formula-copy.js` - LaTeX 公式点击复制。
- `src/popup/popup.js` - 弹窗设置 UI。
- `src/content-main.js` - content script 主流程编排。

## 近期工作总结（v2.00 / 2026-04-28）

本次主要完成了右侧时间线 UI 对齐美化、去红蓝强调色、19+ 对话预览卡顿修复，以及长对话渲染稳定性优化。

### UI 调整

- 悬浮预览改为紧凑索引列表，去除旧的搜索、筛选、宽度和导出工具栏。
- 卡片宽度为 `min(302px, calc(100vw - 32px))`，列表高度 224px，行高 42px。
- 当前项和 focus 使用 `#6ea0ff` 蓝色强调，普通 marker 使用 `#5b5b5b` 灰色。
- 保留右侧固定短 marker rail，鼠标悬浮时展开可滚动、可跳转的预览列表。
- 折叠 rail 最多采样 5 个短横 marker；hover 卡片打开后隐藏独立 rail，避免双层标记干扰。

### 长对话优化

- hover 列表滚动不再触发整卡 `render()`，只更新 `previewScrollTop` 并 patch `.tl-hover-list-window`。
- 19 条这类中等长度对话直接渲染全部行，使用浏览器原生滚动，保证滚动条和第 19 行点击稳定。
- 300 条这类超长对话使用 `src/ui/virtual-list.js` 计算窗口，只渲染可见行和 overscan 行。
- active marker 更新只 patch class，不触发完整 UI 重绘。
- MutationObserver 不再监听 `characterData`，并忽略时间线自身 DOM 变化，减少流式输出期间的刷新压力。

### 新增功能

- **阅读宽度控制**：通过 popup 滑块调整聊天内容宽度（600px-1600px），支持实时预览。
- **公式复制**：点击 KaTeX/MathJax 公式即可复制 LaTeX 源码。
- **弹窗 UI**：新开关控制阅读宽度和公式复制功能的启用/禁用。

### 涉及文件

- `src/ui/virtual-list.js`
- `src/ui/timeline.js`
- `src/ui/styles.js`
- `src/ui/layout.js`
- `src/navigation/locator.js`
- `src/features/formula-copy.js`
- `src/popup/popup.js`
- `src/popup/popup.html`
- `src/popup/popup.css`
- `src/content-main.js`
- `src/core/state.js`
- `manifest.json`
- `content-script.test.html`
- `docs/2026-04-28-timeline-ui-performance-update.md`

### 验证记录

- Chrome headless 打开 `content-script.test.html`：`PASS`
- `manifest.json` 通过 PowerShell `ConvertFrom-Json` 解析
- `git diff --check` 未发现空白错误，仅有 LF/CRLF 提示
- `node --check` 当前被本机 Node 启动断言阻断：`ncrypto::CSPRNG(nullptr, 0)`，未作为本次代码语法错误处理
