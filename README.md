# Writer

[English](./README-en.md) | 简体中文

![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)
![Tauri](https://img.shields.io/badge/Tauri-v2-24C8D8?logo=tauri&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)

Writer 是一款本地优先（Local-first）的跨平台 Markdown 桌面写作工具。  
它希望把 **所见即所得的编辑体验、Markdown 的兼容性、多文件工作区管理** 放进同一个轻量桌面应用里，让不同使用习惯的用户都能更自然地进入写作状态。

> 当前状态：处于活跃的早期开发阶段（v0.3.x），核心编辑与文件管理能力已形成基础闭环。

---

## ✨ 为什么是 Writer

如果你希望：

- 保留 Markdown 文件的开放性与可迁移性
- 又不想被纯语法编辑打断写作过程
- 希望像传统文档工具一样顺手操作
- 同时还能管理多文件、多文件夹的本地工作区

那么 Writer 想解决的，就是这组需求的组合问题。

---

## ✨ 核心特性

### 所见即所得，同时兼容 Markdown
基于 TipTap 构建，支持 Markdown 语法的实时解析与渲染。  
在尽量降低标记语言干扰的同时，保留 Markdown 文件作为底层存储格式。

### 兼容多种编辑习惯
Writer 不只面向单一用户习惯，而是尽量兼容多种常见写作方式：

- 类似传统文档工具的快捷键操作
- 选中文本后的快速样式调整
- 类似 Typora 的直接编辑体验
- 输入 `/` 后通过命令菜单快速插入或切换块级样式

### 本地工作区管理
支持基于本地文件系统的工作区组织能力，包括：

- 多文件夹工作区
- 文件树浏览
- 多级目录结构
- 面向长文档或知识型内容的大纲式组织方式

### 沉浸式写作体验
提供专注于正文输入的沉浸式写作模式。  
在极致禅模式下，可进一步减少界面干扰，为长时间写作提供更干净的界面环境。

### 轻量、快速、跨平台
依托 Rust + Tauri 的底层能力，Writer 在桌面环境中保持较轻的包体与较快的启动响应。  
项目目标是提供一致的跨平台写作体验。

---

## 🖼️ 界面预览

### 多文件工作区与本地文档管理
![多文件工作区与本地文档管理](./assets/screenshots/workspace-overview.png)

支持基于本地文件系统的工作区组织方式，提供文件树、多文档管理与清晰的正文编辑区域。

### 输入 `/` 快速调用命令菜单
![输入 / 快速调用命令菜单](./assets/screenshots/slash-command-menu.png)

通过 Slash Command 快速插入标题、列表、表格、代码块等内容，减少鼠标切换与格式查找成本。

---

## 🖥️ 平台支持

当前支持情况如下：

- Windows（Windows 10 / 11）：常态化开发与测试
- macOS（Intel / Apple Silicon）：已完成主要环境测试
- Linux：处于持续兼容与后续完善阶段

---

## 📦 下载与使用

前往 [Releases](https://github.com/xczl-785/Writer/releases) 页面下载对应平台的安装包。

- Windows：`.msi` / `.exe`
- macOS：`.dmg`
- Linux：`.AppImage` / `.deb`

---

## 🛠️ 开发者指南

参与本项目开发前，请先安装以下工具链：

- [Node.js](https://nodejs.org/)（推荐 v20 及以上）
- [pnpm](https://pnpm.io/)
- [Rust](https://www.rust-lang.org/)

### 环境初始化

```bash
git clone https://github.com/xczl-785/Writer.git
cd Writer
pnpm install
```

### 调试与构建

```
# 启动前端开发服务器（仅 Web 视图）
pnpm dev

# 启动 Tauri 桌面端调试环境
pnpm tauri dev

# 构建生产环境安装包
pnpm build && pnpm tauri build
```

------

## 🏗️ 技术架构

- 前端层：React 19、TypeScript、TipTap、Zustand、TailwindCSS
- 系统层：Rust、Tauri v2

------

## 🤝 参与贡献

欢迎通过 Issue 或 Pull Request 参与项目建设。
 对于涉及结构调整或核心功能方向的改动，建议先提交 Issue 讨论，以减少设计偏移。

------

## 📄 许可协议

本项目基于 GPL-3.0 License 开源发布。
 允许自由使用、修改与分发；衍生软件或二次分发版本需继承同等开源协议。