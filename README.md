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
- Exports selected user input and GPT output to Markdown or a browser print view for saving as PDF.

## Latest Update

Version **v2.00** focuses on a calmer visual style and a smoother long-conversation timeline:

- Aligns the hover toolbar into two stable rows: search on the first row, filters and actions on the second row.
- Fixes the 19+ conversation preview freeze by avoiding full card rebuilds during list scroll.
- Uses native scrolling for medium-length previews and a virtual list window for very long conversations.
- Reduces streaming refresh pressure by ignoring `characterData` mutations and timeline-owned DOM updates.
- Replaces the previous red/blue accents with a neutral green-gray palette.

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
- 支持选择“我的输入”和“GPT 输出”，导出 Markdown，或通过浏览器打印保存为 PDF。

## 最新更新

**v2.00** 更新重点解决长对话时间线卡顿，并把界面强调色改成更克制的中性绿色/灰绿色：

- 悬浮工具栏改为稳定两行布局：搜索框独占第一行，筛选和操作按钮在第二行对齐。
- 修复 19 条以上对话预览滚动时卡住、无法点击第 19 行的问题。
- 中等长度对话使用原生滚动，超长对话才启用虚拟列表窗口，减少 DOM 节点。
- MutationObserver 不再监听 `characterData`，并忽略时间线自身 DOM 更新，降低流式输出期间的刷新压力。
- 去掉原来偏红、偏蓝的强调色，当前 UI 统一为更安静的绿色/灰绿色系。

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

可以把它作为 GitHub Release 附件使用，也可以解压后按“加载已解压的扩展程序”的方式安装。

## 项目结构

- `manifest.json` - MV3 扩展清单。
- `src/background/token-capture.js` - 后台 Bearer token 捕获。
- `src/data/conversation-api.js` - 对话 API 请求和 mapping 解析。
- `src/ui/timeline.js` - 右侧轨道和悬浮预览渲染。
- `src/ui/styles.js` - 注入式时间线样式。
- `src/content-main.js` - content script 主流程编排。

## 近期工作总结（v2.00 / 2026-04-28）

本次主要完成了右侧时间线 UI 对齐美化、去红蓝强调色、19+ 对话预览卡顿修复，以及长对话渲染稳定性优化。

### UI 调整

- 顶部工具栏调整为两行：搜索框第一行全宽显示，角色筛选和操作按钮第二行左右对齐。
- 统一按钮高度、间距、边框半径和字体，减少截图中控件上下漂移、拥挤和错位的问题。
- 去掉原来偏红、偏蓝的强调色，改为中性绿色/灰绿色，整体更安静、统一。
- 保留右侧固定 marker rail，鼠标悬浮时展开可搜索、可选择、可导出、可跳转的预览列表。
- 预览卡片桌面端宽度更适合放下 `选择 / 宽度 / 导出 MD / 导出 PDF`，窄屏仍允许自然换行。

### 长对话优化

- hover 列表滚动不再触发整卡 `render()`，只更新 `previewScrollTop` 并 patch `.tl-hover-list-window`。
- 19 条这类中等长度对话直接渲染全部行，使用浏览器原生滚动，保证滚动条和第 19 行点击稳定。
- 300 条这类超长对话使用 `src/ui/virtual-list.js` 计算窗口，只渲染可见行和 overscan 行。
- active marker 更新只 patch class，不触发完整 UI 重绘。
- MutationObserver 不再监听 `characterData`，并忽略时间线自身 DOM 变化，减少流式输出期间的刷新压力。

### 涉及文件

- `src/ui/virtual-list.js`
- `src/ui/timeline.js`
- `src/ui/styles.js`
- `src/navigation/locator.js`
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
