# Writer 📝

[English](./README-en.md) | 简体中文

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL%203.0-blue.svg)](https://opensource.org/licenses/GPL-3.0)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-24C8D8?logo=tauri)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)

Writer 是一款基于 Tauri + React 构建的**本地优先 (Local-first)** 桌面端 Markdown 编辑器。它结合了 Typora 的**沉浸式编辑体验**与 Obsidian 的**本地文件树管理**，致力于为您提供无打断、极速且安全的专注写作环境。

> ⚠️ **项目状态**: 当前处于活跃开发阶段 (v0.3.x)，核心功能已可用。

---

## ✨ 核心特性

- **🌊 沉浸式编辑**：所见即所得 (WYSIWYG) 的 Markdown 编辑体验，基于 TipTap 构建，让您专注于内容本身。
- **📁 本地文件管理**：左侧提供强大的工作区文件树，支持多目录、文件夹嵌套，轻松管理海量知识库。
- **🔒 本地优先与隐私安全**：所有数据均以纯文本 `.md` 格式保存在您的本地硬盘，无强制云端同步，您的数据完全属于您。
- **⚡ 极速轻量**：得益于 Rust 和 Tauri 底层架构，占用内存极小，启动速度极快。
- **🎨 现代 UI 设计**：基于 TailwindCSS 构建的极简、现代的用户界面，支持定制化主题。

## 🚀 快速体验

您可以在 [Releases](https://github.com/您的用户名/Writer/releases) 页面下载最新版本的预编译安装包（支持 Windows, macOS, Linux）。

*注：开源版本刚刚发布，全平台预编译包将很快通过 GitHub Actions 自动提供。*

## 🛠️ 本地开发指南

如果您希望在本地运行本项目或参与贡献，请确保您的电脑已安装 [Node.js](https://nodejs.org/) (推荐 v18+) 和 [Rust](https://www.rust-lang.org/tools/install) 环境。

### 1. 克隆仓库
```bash
git clone https://github.com/您的用户名/Writer.git
cd Writer
```

### 2. 安装依赖
```bash
npm install
```

### 3. 启动开发服务器
```bash
npm run dev
# 或使用 tauri CLI 启动桌面端调试
npm run tauri dev
```

### 4. 构建生产版本
```bash
npm run build
npm run tauri build
```

## 🏗️ 技术栈

- **前端**: React 19, TypeScript, TipTap (富文本内核), Zustand (状态管理), TailwindCSS (样式)
- **后端**: Rust, Tauri v2 (提供系统级 API 交互与窗口管理)

## 🤝 参与贡献

我们非常欢迎任何形式的贡献！无论您是想要修复 Bug、添加新功能，还是改进文档，都可以随时提交 Pull Request。
在提交大型功能前，建议先开启一个 Issue 进行讨论。

## 📄 开源协议

本项目采用 [GPL-3.0 License](./LICENSE) 开源协议。
这意味着您可以自由地使用、修改和分发本项目，但如果您基于本项目发布了修改后的软件，您的软件也必须以 GPL-3.0 协议开源。
