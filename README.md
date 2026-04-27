# ChatGPT Timeline Navigator

English | [中文](#chatgpt-时间线导航器)

A Chrome/Edge MV3 extension that adds a fixed right-side timeline to ChatGPT conversations.

## Features

- Fetches complete ChatGPT conversation mappings through ChatGPT backend APIs.
- Captures ChatGPT bearer tokens in the background service worker for authenticated API reads.
- Falls back to rendered DOM collection when the API is unavailable.
- Shows a minimal fixed right-side rail with clickable timeline markers.
- Expands a scrollable hover preview with all question groups for long conversations.
- Supports Markdown and JSON conversation export.

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
- 支持 Markdown 和 JSON 格式导出对话。

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
