# ChatGPT Timeline Navigator

English | [中文](#chatgpt-时间线导航器)

A Chrome/Edge extension that adds a fixed right-side timeline to ChatGPT conversations.

Current version: **v2.00**

## Features

- Right-side timeline rail with clickable markers for quick navigation
- Hover to expand a scrollable preview of all question groups
- Fetches complete conversation data via ChatGPT API (falls back to DOM scraping if unavailable)
- Adjustable reading width (600px-1600px) via popup slider
- LaTeX formula click-to-copy from KaTeX/MathJax elements
- Dark mode support

## Install

1. Open `chrome://extensions` or `edge://extensions`
2. Enable developer mode
3. Click `Load unpacked`
4. Select this repository folder

## Test

Open `content-script.test.html` in a browser. The page displays `PASS` when tests pass.

---

# ChatGPT 时间线导航器

[English](#chatgpt-timeline-navigator) | 中文

这是一个 Chrome/Edge 扩展，用于给 ChatGPT 对话添加固定在右侧的时间线导航。

当前版本：**v2.00**

## 功能

- 右侧固定时间线轨道，点击 marker 快速跳转到对应问题
- 鼠标悬浮展开可滚动预览列表，显示所有问题组
- 通过 ChatGPT API 获取完整对话数据（API 不可用时降级为 DOM 读取）
- 可调整阅读宽度（600px-1600px），通过弹窗滑块控制
- LaTeX 公式点击复制，支持 KaTeX 和 MathJax 元素
- 深色模式支持

## 安装

1. 打开 `chrome://extensions` 或 `edge://extensions`
2. 开启开发者模式
3. 点击 `加载已解压的扩展程序`
4. 选择本仓库目录

## 测试

用浏览器打开 `content-script.test.html`，页面显示 `PASS` 表示测试通过。
