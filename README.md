# ChatGPT Timeline Navigator

English | [中文](#chatgpt-时间线导航器)

A Chrome/Edge MV3 extension that adds a fixed right-side timeline to ChatGPT conversations.

## Features

- Fetches complete ChatGPT conversation mappings through ChatGPT backend APIs.
- Captures ChatGPT bearer tokens in the background service worker for authenticated API reads.
- Falls back to rendered DOM collection when the API is unavailable.
- Shows a minimal fixed right-side rail with clickable timeline markers.
- Expands a scrollable hover preview with all question groups for long conversations.
- Exports selected user input and GPT output to Markdown or a browser print view for saving as PDF.

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
packages/chatgpt-timeline-extension-v1.0.0.zip
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

## 功能

- 通过 ChatGPT 后端 API 获取完整对话 mapping，减少长对话只读取已渲染 DOM 的问题。
- 后台 service worker 捕获 ChatGPT 请求里的 Bearer token，用于带认证读取完整对话。
- 当 API 不可用时，仍保留页面 DOM 读取作为降级方案。
- 右侧固定极简时间线轨道，支持点击 marker 跳转到对应问题。
- 鼠标悬浮时展开可滚动预览卡片，长对话会显示全部问题组。
- 支持选择“我的输入”和“GPT 输出”，导出 Markdown，或通过浏览器打印保存为 PDF。

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
packages/chatgpt-timeline-extension-v1.0.0.zip
```

可以把它作为 GitHub Release 附件使用，也可以解压后按“加载已解压的扩展程序”的方式安装。

## 项目结构

- `manifest.json` - MV3 扩展清单。
- `src/background/token-capture.js` - 后台 Bearer token 捕获。
- `src/data/conversation-api.js` - 对话 API 请求和 mapping 解析。
- `src/ui/timeline.js` - 右侧轨道和悬浮预览渲染。
- `src/ui/styles.js` - 注入式时间线样式。
- `src/content-main.js` - content script 主流程编排。

## 近期工作总结（2026-04-27）

本次主要完成了右侧时间线 UI 审美调整和长对话流畅性优化。

### UI 调整

- 将悬浮预览卡片改成更接近 Raycast / Linear 的专业工具风格：实体面板、高对比文字、紧凑列表和更清晰的 active 状态。
- 顶部工具栏增加搜索框、角色筛选、“选择”开关、宽度控制、导出 Markdown 和导出 PDF 入口。
- 默认隐藏每行复选框，只有进入“选择”模式后才显示导出勾选项，减少视觉干扰。
- 保留右侧极简 marker rail，鼠标悬浮时展开可搜索、可选择、可跳转的预览列表。

### 长对话优化

- 新增 `src/ui/virtual-list.js`，提供 `computeVirtualWindow()`，用于长列表虚拟渲染。
- hover 预览列表改为固定行高虚拟列表，长对话只渲染可见窗口和少量 overscan 行，减少 DOM 节点数量。
- 超长对话的右侧 marker rail 增加采样限制，避免一次性渲染过多 marker，同时保留当前 active marker。
- scroll spy 增加 anchor 几何缓存，减少滚动时反复读取 `getBoundingClientRect()` 的开销。
- MutationObserver 过滤时间线自身 DOM 变化，减少无意义刷新和布局重算。

### 涉及文件

- `src/ui/virtual-list.js`
- `src/ui/timeline.js`
- `src/ui/styles.js`
- `src/navigation/locator.js`
- `src/content-main.js`
- `src/core/state.js`
- `manifest.json`
- `content-script.test.html`

### 验证记录

- Chrome headless 打开 `content-script.test.html`：`PASS`
- `manifest.json` 通过 PowerShell `ConvertFrom-Json` 解析
- `git diff --check` 未发现空白错误，仅有 LF/CRLF 提示
- `node --check` 当前被本机 Node 启动断言阻断：`ncrypto::CSPRNG(nullptr, 0)`，未作为本次代码语法错误处理
