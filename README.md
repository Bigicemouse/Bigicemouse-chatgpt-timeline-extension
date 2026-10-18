<div align="center">

# ChatGPT Timeline Navigator

### 让长对话更好找，让阅读与备份更从容。

为 ChatGPT 添加轻量时间线导航、阅读调节与对话导出。<br>
悬停展开 · 快速跳转 · 鼠标移边滚动 · JSON / Markdown 备份

[![Version](https://img.shields.io/badge/version-v2.01-6ea0ff?style=flat-square)](https://github.com/Bigicemouse/Bigicemouse-chatgpt-timeline-extension/releases)
![Chrome / Edge](https://img.shields.io/badge/browser-Chrome%20%2F%20Edge-34a853?style=flat-square)
![Manifest V3](https://img.shields.io/badge/extension-Manifest%20V3-8b5cf6?style=flat-square)
![Plain JavaScript](https://img.shields.io/badge/built_with-JavaScript-f7df1e?style=flat-square&logo=javascript&logoColor=222222)

[功能亮点](#features) · [安装使用](#installation) · [导出说明](#export) · [开发与测试](#development) · [English](#english)

</div>

---

<a id="features"></a>

## ✨ 更顺手的 ChatGPT 长对话体验

| 功能 | 使用体验 |
| :--- | :--- |
| **轻量时间线** | 右侧保留紧凑导航标记，鼠标移上去自动展开目录，点击问题直达对应位置。 |
| **鼠标移边滚动** | 移到目录上沿查看更早的问题，移到下沿查看后面的问题；回到中间即停止，无需滚轮。 |
| **对话字号** | 通过目录顶部的 `A− / A+` 调整用户消息与 GPT 回复的文字大小，支持 **12–24 px**，自动保存选择。 |
| **舒适阅读宽度** | 在扩展弹窗中开关宽度调整，支持 **600–1600 px**，同时调整正文与输入框宽度。 |
| **公式复制** | 点击支持的公式复制 LaTeX 源码，适合整理数学笔记与技术资料。 |
| **对话备份** | 全部导出或选择对话导出，生成同时包含 **JSON + Markdown** 的 ZIP 文件。 |
| **长列表优化** | 使用虚拟列表与节点复用，减少长对话目录的重复创建和渲染。 |
| **浅色 / 深色** | 导航跟随页面主题，扩展弹窗适配系统浅色与深色外观。 |

> **字号调节作用于对话正文。** 时间线目录文字保持独立大小，阅读宽度与字号可以分别调整。

<a id="installation"></a>

## 🚀 安装与开始使用

### 1. 加载扩展

从 [Releases](https://github.com/Bigicemouse/Bigicemouse-chatgpt-timeline-extension/releases) 下载发布包并解压，或下载本仓库源码。

| 浏览器 | 扩展管理页 |
| :--- | :--- |
| Google Chrome | `chrome://extensions` |
| Microsoft Edge | `edge://extensions` |

打开扩展管理页，开启 **开发者模式** → 点击 **加载已解压的扩展程序** → 选择包含 `manifest.json` 的目录。

### 2. 打开 ChatGPT

访问并登录 [chatgpt.com](https://chatgpt.com/)，打开一段对话，即可使用右侧导航。

| 想做什么 | 怎么操作 |
| :--- | :--- |
| 找到前面的问题 | 鼠标悬停右侧导航，在目录中点击问题。 |
| 浏览很长的目录 | 将鼠标移向列表上沿或下沿，移回中间停止滚动。 |
| 放大 / 缩小正文 | 使用目录顶部「对话字号」旁的 `A− / A+`。 |
| 调整阅读宽度 | 点击浏览器工具栏中的扩展图标，调整阅读宽度滑块。 |
| 备份对话 | 在扩展弹窗底部点击 **打开导出面板**。 |

<details>
<summary><strong>更新后没有看到新功能？</strong></summary>

替换本地扩展文件后，在扩展管理页点击本扩展的 **重新加载**，然后刷新已经打开的 ChatGPT 页面。

发布包内容以对应 Release 为准；体验仓库中的最新改动，可以直接加载本仓库源码。

</details>

<a id="export"></a>

## 📦 把对话变成可阅读、可保留的文件

导出入口位于扩展弹窗的 **阅读宽度卡片下方**。打开面板后，可以选择个人、项目或团队空间。

- **按需选择**：导出全部对话，或通过搜索、排序和筛选选择需要的对话。
- **增量备份**：只导出上次备份后新增或更新的内容。
- **项目归档**：项目对话按文件夹整理。
- **可选附件**：按需包含支持下载的附件与文件。
- **进度与容错**：查看导出进度、随时停止；遇到限流自动等待重试，失败信息写入报告。

| 导出格式 | 保留的内容 | 适合用途 |
| :--- | :--- | :--- |
| **JSON** | 接口返回的完整对话数据，包含其他分支。 | 保存原始备份、后续处理。 |
| **Markdown** | 当前分支中用户与助手的可见消息，附带元信息。 | 阅读、整理笔记、导入知识库。 |
| **ZIP** | 汇总 JSON、Markdown，以及所选附件和必要的错误报告。 | 本地归档、统一管理。 |

> 导出使用当前页面的登录状态；团队空间需要相应访问权限。附件会增加耗时与文件体积，实际可导出的内容取决于接口返回结果。导出组件在首次点击入口时按需加载。

<a id="development"></a>

## 🛠️ 开发与测试

项目使用 **Manifest V3 + 原生 JavaScript**，无需打包构建。修改源码后，重新加载扩展并刷新 ChatGPT 页面即可验证。

```text
src/
├── background/    身份令牌捕获、导出组件按需加载
├── core/          工具函数、状态与偏好设置
├── data/          对话 API、页面消息采集
├── navigation/    滚动定位与当前问题追踪
├── ui/            时间线、虚拟列表、阅读布局与样式
├── popup/         扩展弹窗与设置入口
├── features/      公式复制
└── vendor/        导出组件、JSZip 与第三方许可说明
```

**时间线回归测试**：在浏览器中打开 [`content-script.test.html`](./content-script.test.html)，页面显示 `PASS` 表示通过；失败时显示对应原因。

**导出接入测试**：在仓库根目录运行：

```bash
node --test exporter.test.cjs
```

这组测试检查导出入口与按需加载、重复请求处理、错误反馈及消息来源限制。真实账号中的接口权限与导出结果，需要在登录后的 ChatGPT 页面验证。

<a id="contributors"></a>

## 🤝 贡献与致谢

| 参与者 | 贡献 |
| :--- | :--- |
| [**Bigicemouse**](https://github.com/Bigicemouse) | 项目维护、需求设计与使用反馈。 |
| **GPT** | AI 开发协作：功能实现、界面迭代与测试辅助。 |

导出功能集成自 [huhusmang / ChatGPT-Exporter](https://github.com/huhusmang/ChatGPT-Exporter)，ZIP 打包使用 [JSZip](https://github.com/Stuk/jszip)。感谢原作者与贡献者，来源版本和许可见 [`src/vendor/NOTICE.txt`](./src/vendor/NOTICE.txt)。

欢迎通过 [Issues](https://github.com/Bigicemouse/Bigicemouse-chatgpt-timeline-extension/issues) 反馈问题。附上浏览器版本、复现步骤与必要截图，可以帮助更快定位。

---

<a id="english"></a>

<details>
<summary><strong>English · Features & Quick Start</strong></summary>

### Navigate, read, and back up your ChatGPT conversations

A lightweight Chrome / Edge Manifest V3 extension for navigating long ChatGPT conversations and exporting backups.

- **Conversation navigation** — hover over the right-side rail to open the index; click a question to jump to it.
- **Pointer-driven scrolling** — move toward the top or bottom of the index to scroll; return to the center to stop.
- **Reading controls** — adjust conversation text size from **12–24 px**, and set reading width from **600–1600 px**.
- **LaTeX copy** — click a supported formula to copy its LaTeX source.
- **ZIP backups** — export all or selected conversations as JSON and Markdown, with incremental backups, optional attachments, and personal / project / team workspace support.
- **Responsive previews** — virtualized lists and reused DOM nodes reduce repeated rendering in long conversations.

### Install

Download and extract a package from [Releases](https://github.com/Bigicemouse/Bigicemouse-chatgpt-timeline-extension/releases), or use the repository source. Open `chrome://extensions` or `edge://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the folder containing `manifest.json`.

Open a conversation on [chatgpt.com](https://chatgpt.com/). Reading-width settings and the export entry are available in the extension popup. After an update, reload the extension and refresh your ChatGPT tabs.

JSON preserves the full conversation tree returned by the API; Markdown contains the current visible branch. Export availability depends on your login session and workspace permissions.

### Contributors

**Bigicemouse** — project maintenance, product direction, and feedback.<br>
**GPT** — AI development collaboration, UI iteration, and test assistance.

Export functionality is based on [ChatGPT-Exporter](https://github.com/huhusmang/ChatGPT-Exporter), with ZIP generation by [JSZip](https://github.com/Stuk/jszip). See [third-party notices](./src/vendor/NOTICE.txt).

</details>

<div align="center">

**更少翻找，更专注于对话本身。**

[下载发布版](https://github.com/Bigicemouse/Bigicemouse-chatgpt-timeline-extension/releases) · [反馈问题](https://github.com/Bigicemouse/Bigicemouse-chatgpt-timeline-extension/issues) · [返回顶部](#chatgpt-timeline-navigator)

</div>
