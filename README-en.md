# Writer 📝

English | [简体中文](./README.md)

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL%203.0-blue.svg)](https://opensource.org/licenses/GPL-3.0)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-24C8D8?logo=tauri)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)

Writer is a **local-first** desktop Markdown editor built with Tauri and React. It perfectly blends Typora's **immersive editing experience** with Obsidian's **local file tree management**, offering you a distraction-free, lightning-fast, and secure writing environment.

> ⚠️ **Project Status**: Currently in active development (v0.3.x). Core features are ready to use.

---

## ✨ Core Features

- **🌊 Immersive Editing**: A WYSIWYG (What You See Is What You Get) Markdown experience built on TipTap, letting you focus entirely on your content.
- **📁 Local File Management**: Features a powerful sidebar file tree, supporting multiple directories and nested folders to easily organize your massive knowledge base.
- **🔒 Local-First & Privacy Secure**: All data is saved as plain `.md` text files directly to your local hard drive. No forced cloud synchronization—your data truly belongs to you.
- **⚡ Fast & Lightweight**: Powered by Rust and Tauri under the hood, ensuring minimal memory footprint and lightning-fast startup speeds.
- **🎨 Modern UI Design**: A minimalist and modern user interface built with TailwindCSS.

## 💻 Cross-Platform Support

Writer is committed to providing a consistent desktop experience across all major operating systems:

- 🪟 **Windows** (Windows 10 / 11) - _Primary Platform_
- 🍎 **macOS** (Intel & Apple Silicon)
- 🐧 **Linux** (Ubuntu, Fedora, Arch, etc.)

## 🚀 Quick Start

You can download the latest pre-compiled installers for your operating system from the [Releases](https://github.com/xczl-785/Writer/releases) page (supports Windows, macOS, Linux).

_Note: As this open-source repository has just been launched, multi-platform pre-compiled binaries will soon be automatically provided via GitHub Actions._

## 🛠️ Local Development Guide

If you wish to run the project locally or contribute, please ensure you have [Node.js](https://nodejs.org/) (v18+ recommended) and [Rust](https://www.rust-lang.org/tools/install) installed on your machine.

### 1. Clone the repository

```bash
git clone https://github.com/xczl-785/Writer.git
cd Writer
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm run dev
# Or start the desktop debugging environment using tauri CLI
npm run tauri dev
```

### 4. Build for production

```bash
npm run build
npm run tauri build
```

## 🏗️ Tech Stack

- **Frontend**: React 19, TypeScript, TipTap (Rich Text Core), Zustand (State Management), TailwindCSS (Styling)
- **Backend**: Rust, Tauri v2 (Providing system-level APIs and window management)

## 🤝 Contributing

We warmly welcome all forms of contributions! Whether you want to fix bugs, add new features, or improve documentation, feel free to submit a Pull Request.
Before submitting a major feature PR, we recommend opening an Issue to discuss it first.

## 📄 License

This project is open-sourced under the [GPL-3.0 License](./LICENSE).
This means you are free to use, modify, and distribute this software, but if you distribute modified versions of this software, they must also be licensed under GPL-3.0.
