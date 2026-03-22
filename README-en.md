# Writer 📝

English | [简体中文](./README.md)

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL%203.0-blue.svg)](https://opensource.org/licenses/GPL-3.0)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-24C8D8?logo=tauri)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)

Writer is a cross-platform desktop Markdown editor adopting a local-first architecture. This project integrates an immersive rich-text editing experience with native local file system management, aiming to provide a distraction-free, highly responsive, and privacy-focused writing environment.

> **Current Status**: In an active early development stage (v0.3.x). Core editing and file management capabilities are implemented.

---

## ✨ Core Features

- 🌊 **WYSIWYG Editor**: Built on the TipTap engine, supporting real-time parsing and rendering of Markdown syntax to minimize visual interference from markup languages.
- 📁 **Local Workspace Management**: Features native file system mapping, supporting multi-level directory nesting and structured management of local knowledge bases.
- 🔒 **Data Privacy Protection**: Strictly enforces local file storage policies. Data is retained in plain `.md` text formats without any unauthorized cloud synchronization mechanisms.
- ⚡ **High Performance**: Powered by Rust and the Tauri framework at the lower level, achieving low memory footprint and low-latency responses.
- 🎨 **Modern User Interface**: Designed with TailwindCSS, following minimalist conventions while adapting to high-resolution displays and system theme switching.

## 💻 Cross-Platform Support

The project is committed to providing a consistent desktop experience. The current status is as follows:

- 🪟 **Windows** (Windows 10 / 11) - _Routine development and testing platform_
- 🍎 **macOS** (Intel & Apple Silicon) - _Routine development and testing platform_
- 🐧 **Linux** - _In the roadmap; comprehensive compatibility verification is pending_

## 🚀 Download & Usage

Download installers for your platform from the [Releases](https://github.com/xczl-785/Writer/releases) page:

| Platform | Installer Format     |
| -------- | -------------------- |
| Windows  | `.msi` / `.exe`      |
| macOS    | `.dmg`               |
| Linux    | `.AppImage` / `.deb` |

## 🛠️ Developer Guide

To participate in the development of this project, pre-configuration of [Node.js](https://nodejs.org/) (v20 or higher recommended), [pnpm](https://pnpm.io/), and the [Rust](https://www.rust-lang.org/tools/install) toolchain is required.

### Environment Initialization

```bash
git clone https://github.com/xczl-785/Writer.git
cd Writer
pnpm install
```

### Debugging & Building

```bash
# Start frontend dev server (Web view only)
pnpm dev

# Start Tauri desktop debugging environment
pnpm tauri dev

# Build production binaries across all platforms
pnpm build && pnpm tauri build
```

## 🏗️ Technical Architecture

- **Frontend Tier**: React 19, TypeScript, TipTap (Rich Text Core), Zustand (State Container), TailwindCSS (Utility-First Styling)
- **System Tier**: Rust, Tauri v2 (System API bridging, window lifecycle management, and native interactions)

## 🤝 Contributing

Contributions via Issues or Pull Requests are welcome. For proposals introducing large-scale architectural changes or core feature iterations, submitting an Issue beforehand is recommended to ensure consistency with design principles.

## 📄 License

This project is open-sourced under the [GPL-3.0 License](./LICENSE).
Free use, modification, and distribution are permitted. Derivative software or redistributions must inherit the equivalent open-source license.
