# ChatGPT Timeline Navigator

English | [中文](#chatgpt-时间线导航器)

A Chrome/Edge Manifest V3 extension that adds a compact conversation navigator and export tools to ChatGPT.

Current version: **v2.01** · [Releases](https://github.com/Bigicemouse/Bigicemouse-chatgpt-timeline-extension/releases)

## Features

- Fixed timeline rail with conversation markers and quick jump navigation
- Hover the rail to open a compact conversation index; click a row to jump, and move the pointer near the list edges to auto-scroll long conversations
- Adjust GPT conversation text size from the index card (12–24 px)
- Virtualized preview for long conversations to keep scrolling and switching responsive
- Export all or selected conversations as ZIP files containing JSON and Markdown; supports incremental backups and personal, project, and team workspaces
- Toggle LaTeX formula copy for KaTeX/MathJax
- Optional comfortable reading width (600–1600 px), adjustable from the extension popup

## Install

**Download:** [v2.01 for Chrome/Edge](https://github.com/Bigicemouse/Bigicemouse-chatgpt-timeline-extension/releases/download/v2.01/chatgpt-timeline-extension-v2.01.zip)

1. Download and extract the ZIP file.
2. Open `chrome://extensions` or `edge://extensions`.
3. Enable developer mode, choose **Load unpacked**, and select the extracted folder.

To load from source, select this repository folder instead.

## Test

Open `content-script.test.html` in a browser for the timeline regression tests. Run the exporter bridge tests with `node --test exporter.test.cjs`.

---

# ChatGPT 时间线导航器

[English](#chatgpt-timeline-navigator) | 中文

这是一个适用于 Chrome / Edge 的 Manifest V3 扩展，为 ChatGPT 添加紧凑的对话导航和导出功能。

当前版本：**v2.01** · [查看 Releases / 下载](https://github.com/Bigicemouse/Bigicemouse-chatgpt-timeline-extension/releases)

## 功能

- 固定时间线轨道和对话 marker，点击即可跳转
- 鼠标悬停轨道打开紧凑对话目录；点击条目跳转，鼠标移到列表边缘可让长列表自动滚动
- 在目录卡片中调整 GPT 对话文字大小（12–24 px）
- 长对话使用虚拟列表，减少渲染负担，让滚动和切换更流畅
- 将全部或选中的对话导出为 ZIP，内含 JSON 和 Markdown；支持增量备份、个人空间、项目空间和团队空间
- 可开关 KaTeX / MathJax 的 LaTeX 公式复制
- 可在扩展弹窗中开启舒适阅读宽度，并在 600–1600 px 范围内调整

## 安装

**下载：**[v2.01 Chrome / Edge 安装包](https://github.com/Bigicemouse/Bigicemouse-chatgpt-timeline-extension/releases/download/v2.01/chatgpt-timeline-extension-v2.01.zip)

1. 下载并解压 ZIP 文件。
2. 打开 `chrome://extensions` 或 `edge://extensions`。
3. 开启开发者模式，点击**加载已解压的扩展程序**，选择刚才解压的目录。

从源码加载时，直接选择本仓库目录。

## 测试

在浏览器中打开 `content-script.test.html` 运行时间线回归测试；使用 `node --test exporter.test.cjs` 运行导出桥接测试。
