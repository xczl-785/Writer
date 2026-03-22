# Writer 📝

[English](./README-en.md) | 简体中文

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL%203.0-blue.svg)](https://opensource.org/licenses/GPL-3.0)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-24C8D8?logo=tauri)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)

Writer 是一款采用本地优先（Local-first）架构的跨平台 Markdown 桌面编辑器。本项目整合了沉浸式富文本编辑体验与本地文件系统管理能力，旨在提供无干扰、高响应速度及隐私安全的写作环境。

> **当前状态**: 处于活跃的早期开发阶段 (v0.3.x)，核心编辑与文件管理功能已实现闭环。

---

## ✨ 核心特性

- 🌊 **所见即所得 (WYSIWYG) 编辑器**：基于 TipTap 引擎构建，支持 Markdown 语法的实时解析与渲染，降低标记语言的视觉干扰。
- 📁 **本地工作区管理**：提供原生文件系统映射功能，支持多级目录嵌套与本地知识库的结构化管理。
- 🔒 **数据隐私保护**：严格执行本地文件存储策略，数据以纯文本 `.md` 格式留存，不存在未经授权的云端同步机制。
- ⚡ **高能效比**：依托 Rust 语言与 Tauri 框架底层驱动，实现系统资源的低负载占用与低延迟响应。
- 🎨 **现代化交互界面**：基于 TailwindCSS 构建，遵循极简设计规范，适配高分辨率屏幕与系统主题切换。

## 💻 跨平台支持

项目致力于提供一致的跨平台桌面体验，当前状态如下：

- 🪟 **Windows** (Windows 10 / 11) - _常态化开发与测试平台_
- 🍎 **macOS** (Intel & Apple Silicon) - _常态化开发与测试平台_
- 🐧 **Linux** - _暂未进行全量兼容性验证，处于后续计划线路图中_

## 🚀 下载与使用

前往 [Releases](https://github.com/xczl-785/Writer/releases) 页面下载对应平台的安装包：

| 平台    | 安装包格式           |
| ------- | -------------------- |
| Windows | `.msi` / `.exe`      |
| macOS   | `.dmg`               |
| Linux   | `.AppImage` / `.deb` |

## 🛠️ 开发者指南

参与本项目开发需预先配置 [Node.js](https://nodejs.org/) (推荐 v20 及以上版本)、[pnpm](https://pnpm.io/) 与 [Rust](https://www.rust-lang.org/tools/install) 工具链。

### 环境初始化

```bash
git clone https://github.com/xczl-785/Writer.git
cd Writer
pnpm install
```

### 调试与构建

```bash
# 启动前端开发服务器（仅 Web 视图）
pnpm dev

# 启动 Tauri 桌面端调试环境
pnpm tauri dev

# 构建全平台生产环境二进制包
pnpm build && pnpm tauri build
```

## 🏗️ 技术架构

- **前端层**: React 19, TypeScript, TipTap (富文本内核), Zustand (状态容器), TailwindCSS (原子化样式)
- **系统层**: Rust, Tauri v2 (提供系统 API 桥接、窗口生命周期管理及原生交互)

## 🤝 参与贡献

欢迎通过 Issue 或 Pull Request 参与项目建设。对于引入大规模结构变更或核心功能迭代的提案，建议先行提交 Issue 以确保设计理念的一致性。

## 📄 许可协议

本项目基于 [GPL-3.0 License](./LICENSE) 协议开源发布。
允许自由使用、修改及分发，衍生软件或二次分发版本需继承同等开源协议。
