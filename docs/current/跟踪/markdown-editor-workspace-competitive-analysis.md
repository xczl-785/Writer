# Markdown Editor Workspace/Folder Management - Competitive Analysis

**Research Date:** March 8, 2026  
**Purpose:** Inform Writer V6 Workspace Feature Design  
**Scope:** Typora, Obsidian, Zettlr, iA Writer, Bear, Joplin, Mark Text

---

## Executive Summary

This analysis examines how major Markdown editors handle workspace and folder management. Key findings reveal three distinct paradigms:

1. **Single-Folder Model** (Typora, Mark Text): One folder at a time with simple file tree
2. **Multi-Workspace Model** (Zettlr, iA Writer): Multiple independent folders/workspaces simultaneously
3. **Vault Model** (Obsidian): Self-contained knowledge bases with full isolation

---

## 1. Typora

### 1.1 Folder Opening Mechanism

| Feature             | Implementation                                                       |
| ------------------- | -------------------------------------------------------------------- |
| **Primary Method**  | `File` → `Open Folder` dialog                                        |
| **Auto-Load**       | Opening any file automatically loads its parent folder               |
| **Single vs Multi** | **Single folder only** - Cannot open multiple folders simultaneously |

> Source: [Typora File Management Documentation](https://support.typora.io/File-Management/)

### 1.2 Multi-Folder Workspace Support

**Status:** ❌ **NOT SUPPORTED**

- Typora can only have one "loaded folder" at a time
- GitHub issue [#2126: Open Project (multiple folders)](https://github.com/typora/typora-issues/issues/2126) exists as feature request
- Users must switch between folders using the sidebar

### 1.3 File Tree Navigation

| Feature             | Details                                                    |
| ------------------- | ---------------------------------------------------------- |
| **View Modes**      | File Tree (hierarchical) OR File List (flat)               |
| **Sidebar Toggle**  | Menu bar, title bar (macOS), or status bar (Windows/Linux) |
| **Outline Panel**   | Separate tab showing document TOC                          |
| **Sorting**         | Natural order, alphabet, modified date, creation date      |
| **Group by Folder** | Option to show folders before files or mixed               |

```
Sidebar Structure:
├── Outline Panel (document TOC)
├── File Tree (folder hierarchy)
└── File List (flat file list)
```

### 1.4 Drag & Drop Behaviors

| Action                   | Behavior                                     |
| ------------------------ | -------------------------------------------- |
| **Within File Tree**     | Move files/folders to new locations          |
| **From Finder/Explorer** | Add files to sidebar                         |
| **To Document**          | Insert link to dragged file/folder           |
| **Cross-Application**    | Supported between OS file manager and Typora |

> ⚠️ Known Issue: Dragging from file tree to document could cause crashes (fixed in later versions)

### 1.5 Recent Items Management

| Feature                | Implementation                               |
| ---------------------- | -------------------------------------------- |
| **Recent Folders**     | List in sidebar, menubar, Open Quickly panel |
| **Recent Files**       | Tracked per session                          |
| **Pinning**            | Folders can be pinned to prevent removal     |
| **JumpList (Windows)** | Recent folders/files accessible from taskbar |
| **Clear History**      | `File` → `Open Recent` → `Clear Items`       |

### 1.6 State Persistence

| Setting                  | Option                                                  |
| ------------------------ | ------------------------------------------------------- |
| **Launch Behavior**      | Set default folder on launch                            |
| **Reopen Last File**     | Windows/Linux: Preferences → General → On Launch        |
| **macOS Window Restore** | System Preference: "Close windows when quitting an app" |

### 1.7 Key Differentiators

- ✅ Simple, distraction-free approach
- ✅ Fast folder switching
- ✅ Global search across current folder
- ❌ No multi-folder support
- ❌ No workspace state saving beyond recent folders

---

## 2. Obsidian

### 2.1 The "Vault" Concept

A **Vault** is a self-contained folder containing:

- Markdown notes (plain text files)
- Subfolders (unlimited nesting)
- `.obsidian/` configuration folder with:
  - Settings (hotkeys, themes, plugins)
  - `workspace.json` - current layout state
  - `workspaces.json` - saved workspace layouts

> Source: [How Obsidian Stores Data](https://retypeapp.github.io/obsidian/data-storage/)

```
Vault Structure:
📁 MyVault/
├── 📁 .obsidian/              (hidden config folder)
│   ├── 📄 workspace.json      (current layout)
│   ├── 📄 workspaces.json     (saved workspaces)
│   ├── 📁 plugins/
│   ├── 📁 themes/
│   └── 📄 app.json            (settings)
├── 📁 Notes/
│   ├── 📄 Daily Notes/
│   └── 📄 Projects/
└── 📄 README.md
```

### 2.2 Multi-Vault Support

| Feature             | Implementation                                       |
| ------------------- | ---------------------------------------------------- |
| **Multiple Vaults** | ✅ Yes - Each in separate window                     |
| **Same Window**     | ❌ No - Cannot open multiple vaults in single window |
| **Vault Switching** | Vault picker button or hotkey                        |
| **Vault Isolation** | Each vault has independent plugins, themes, settings |

> Source: [Work with Multiple Vaults](https://jackiexiao.github.io/obsidian-docs/en/How%20to/Work%20with%20multiple%20vaults/)

**Use Cases for Multiple Vaults:**

- Work vs Personal notes
- Different projects requiring different plugins
- Testing configurations without affecting main vault

### 2.3 Folder Navigation

| Feature             | Details                              |
| ------------------- | ------------------------------------ |
| **File Explorer**   | Core plugin - hierarchical tree view |
| **Quick Switcher**  | `Cmd/Ctrl + O` - fuzzy file finder   |
| **Command Palette** | `Cmd/Ctrl + P` - command search      |
| **Graph View**      | Visual relationship map of notes     |
| **Tags Pane**       | Filter notes by tags                 |
| **Starred Notes**   | Bookmark important files             |

### 2.4 Drag & Drop Behaviors

| Action                   | Behavior                          |
| ------------------------ | --------------------------------- |
| **Within File Explorer** | Move/reorganize files and folders |
| **To Canvas**            | Create visual node from note      |
| **To Editor**            | Create internal link              |
| **External Files**       | Import attachments to vault       |
| **Create Links**         | Drag while holding modifier keys  |

### 2.5 Recent Files/Vaults

| Feature            | Implementation                                       |
| ------------------ | ---------------------------------------------------- |
| **Recent Files**   | Core functionality + "Recent Files" plugin available |
| **Quick Switcher** | Shows recently opened files                          |
| **Vault History**  | List of previously opened vaults                     |
| **Starred**        | Mark frequently used notes                           |

### 2.6 Workspace State Persistence

**Core Plugin: Workspaces**

| Feature                 | Details                                                  |
| ----------------------- | -------------------------------------------------------- |
| **Save Layout**         | Save current pane arrangement, open files, sidebar state |
| **Load Layout**         | Restore saved workspace configuration                    |
| **Auto-Save**           | `workspace.json` updates automatically                   |
| **Multiple Workspaces** | Save different layouts for different activities          |

**State Files:**

- `.obsidian/workspace.json` - Current session
- `.obsidian/workspaces.json` - Named workspace presets

**Metadata Cache:**

- IndexedDB stores file metadata for fast loading
- Auto-refreshes when files change externally
- Can be rebuilt if corrupted

### 2.7 Key Differentiators

- ✅ Full vault isolation (settings, plugins per vault)
- ✅ Powerful workspace layout saving
- ✅ Plain text - files accessible outside Obsidian
- ✅ Extensive plugin ecosystem
- ❌ No single-window multi-vault support
- ❌ Vaults cannot overlap (no vault-in-vault)

---

## 3. Zettlr

### 3.1 Workspace Concept

**Definition:** A workspace is a regular folder designated for Markdown work.

| Feature                 | Implementation                                 |
| ----------------------- | ---------------------------------------------- |
| **Multiple Workspaces** | ✅ Yes - Multiple folders simultaneously       |
| **Root Files**          | Standalone files outside workspaces            |
| **File Manager**        | Left sidebar showing workspaces and root files |

> Source: [Zettlr Workspaces Documentation](https://docs.zettlr.com/en/core/workspaces/)

```
File Manager Structure:
📁 Files (standalone/root files)
│   ├── 📄 standalone1.md
│   └── 📄 standalone2.md
│
📂 Workspaces
    ├── 📁 Project A/        (Workspace 1)
    │   ├── 📄 chapter1.md
    │   └── 📄 chapter2.md
    └── 📁 Project B/        (Workspace 2)
        └── 📄 notes.md
```

### 3.2 Multi-Workspace Support

| Feature               | Details                                        |
| --------------------- | ---------------------------------------------- |
| **Open Workspaces**   | `File` → `Open Workspace`                      |
| **Close Workspace**   | Remove from Zettlr without deleting files      |
| **Workspace Order**   | Can be reordered (feature request implemented) |
| **Collapse Sections** | Files and Workspaces sections can be collapsed |

### 3.3 File Tree Navigation

| Feature          | Details                                 |
| ---------------- | --------------------------------------- |
| **Filter**       | Real-time filter at top of file manager |
| **Sorting**      | Alphabetical, by date, by type          |
| **Custom Icons** | Folders can have custom icons           |
| **Projects**     | Folders can be designated as projects   |
| **File List**    | Alternative view showing all files flat |
| **Quicklook**    | Spacebar preview (macOS)                |

### 3.4 Drag & Drop Behaviors

| Action                  | Behavior                              |
| ----------------------- | ------------------------------------- |
| **Within File Manager** | Move files between folders/workspaces |
| **External Files**      | Add to workspace                      |
| **Reordering**          | Drag to rearrange workspace order     |
| **Tags**                | Drag tags to files                    |

### 3.5 State Persistence

| Feature              | Implementation          |
| -------------------- | ----------------------- |
| **Open Workspaces**  | Restored on launch      |
| **Open Files**       | Tabs restored           |
| **Window State**     | Position and size saved |
| **Project Settings** | Stored per folder       |

### 3.6 Key Differentiators

- ✅ True multi-workspace support (like VS Code)
- ✅ Root files for quick one-off edits
- ✅ Project features for academic writing
- ✅ Custom folder icons
- ❌ Less visual polish than Typora/Obsidian

---

## 4. iA Writer

### 4.1 Library Concept

| Component     | Description                                             |
| ------------- | ------------------------------------------------------- |
| **Organizer** | Leftmost panel - folders, favorites, smart folders      |
| **File List** | Middle panel - files in selected folder                 |
| **Locations** | Local folders and cloud storage (iCloud, Dropbox, etc.) |

> Source: [iA Writer Library](https://ia.net/writer/support/library)

### 4.2 Multi-Folder Support

| Feature                | Implementation                           |
| ---------------------- | ---------------------------------------- |
| **Multiple Locations** | ✅ Yes - Multiple folders in Organizer   |
| **Favorites**          | Pin important folders for quick access   |
| **Smart Folders**      | Dynamic folders based on search criteria |
| **Cloud Integration**  | iCloud, Dropbox, Google Drive            |

### 4.3 File Tree Navigation (Tree View - v7.2+)

| Feature           | Details                                 |
| ----------------- | --------------------------------------- |
| **Tree View**     | Inline folder expansion (2024 addition) |
| **Drag & Drop**   | Reorganize files across folders         |
| **Inline Rename** | Rename files in place                   |
| **Text Excerpts** | Toggle file content previews            |
| **Favorites**     | Quick access to important folders       |

> Source: [Faster Filing With Tree View](https://ia.net/topics/faster-filing-with-tree-view-a-step-forward-for-large-writing-projects)

```
Library Structure:
📁 Organizer (left panel)
├── ⭐ Favorites
│   └── 📁 Active Project
├── 📁 iCloud Drive
│   ├── 📁 Documents
│   │   ├── 📄 file1.md
│   │   └── 📄 file2.md
│   └── 📁 Notes/
└── 📁 Local Storage
    └── 📁 Projects/
```

### 4.4 Drag & Drop Behaviors

| Action             | Behavior                                  |
| ------------------ | ----------------------------------------- |
| **Tree View**      | Drag files between folders                |
| **Content Blocks** | Drag files into document as transclusions |
| **Reordering**     | Drag to reorder files                     |
| **Cross-Platform** | Consistent across macOS, iOS, iPadOS      |

### 4.5 Organization Features

| Feature           | Description                                                     |
| ----------------- | --------------------------------------------------------------- |
| **Hashtags**      | Inline organization within documents                            |
| **Wikilinks**     | `[[Note Name]]` syntax for linking                              |
| **Smart Folders** | Dynamic organization based on criteria                          |
| **Outline**       | Document structure navigation (Windows only, coming to Mac/iOS) |

### 4.6 Key Differentiators

- ✅ Beautiful, minimalist design
- ✅ Tree view with inline expansion
- ✅ Content blocks for transclusion
- ✅ Cross-platform consistency
- ❌ No true workspace state saving
- ❌ Single document focus (no tabs until recently)

---

## 5. Bear

### 5.1 Organization Model

**Paradigm:** Tag-based (no folders)

| Feature          | Implementation                                                     |
| ---------------- | ------------------------------------------------------------------ |
| **Organization** | Tags only - no folder hierarchy                                    |
| **Nested Tags**  | Infinite nesting with `/` separator (e.g., `#work/project/active`) |
| **Sidebar**      | Tag list, not folder tree                                          |
| **Note List**    | Filtered by selected tag(s)                                        |

> Source: [Bear Tips: Tags](https://blog.bear.app/2017/08/bear-tips-organize-notes-with-tags-and-infinite-nested-tags/)

### 5.2 Workspace Features

| Feature               | Status             |
| --------------------- | ------------------ |
| **Multiple Windows**  | Limited            |
| **Workspaces**        | Not a core concept |
| **State Persistence** | Last view restored |
| **Export**            | Tag-based export   |

### 5.3 Key Differentiators

- ✅ Tag-based organization (flexible, non-hierarchical)
- ✅ Beautiful UI
- ✅ Great for note-taking
- ❌ No folder support
- ❌ No workspace state management
- ❌ Locked ecosystem (proprietary format)

---

## 6. Joplin

### 6.1 Organization Model

| Feature           | Implementation                |
| ----------------- | ----------------------------- |
| **Notebooks**     | Folder-like containers        |
| **Sub-notebooks** | Hierarchical nesting          |
| **Tags**          | Additional organization layer |
| **Sidebar**       | Notebook tree + tag list      |

### 6.2 Multi-Notebook Support

| Feature                | Details                     |
| ---------------------- | --------------------------- |
| **Multiple Notebooks** | ✅ Unlimited notebooks      |
| **Notebook Stack**     | Parent-child relationships  |
| **Quick Switching**    | Sidebar navigation          |
| **Search**             | Global across all notebooks |

### 6.3 State Persistence

| Feature             | Implementation                        |
| ------------------- | ------------------------------------- |
| **Open Notes**      | Multiple notes in tabs                |
| **Cursor Position** | Restored when reopening notes (v3.5+) |
| **Scroll Position** | Preserved                             |
| **View State**      | Split view, editor/viewer layout      |

### 6.4 Key Differentiators

- ✅ End-to-end encryption
- ✅ Sync with multiple services
- ✅ Web Clipper
- ✅ Plugin system
- ❌ Custom database format (not plain files)
- ❌ No true workspace concept

---

## 7. Mark Text

### 7.1 Folder Management

| Feature          | Implementation                        |
| ---------------- | ------------------------------------- |
| **Open Folder**  | Single folder at a time               |
| **Sidebar**      | File tree view                        |
| **Multi-folder** | ❌ Not supported (GitHub issue #2222) |

### 7.2 Key Characteristics

- Open source alternative to Typora
- Single-folder model like Typora
- File tree sidebar
- Limited workspace features
- Development appears slower than other editors

---

## 8. Comparative Analysis Matrix

| Feature                    | Typora | Obsidian    | Zettlr | iA Writer | Bear  | Joplin |
| -------------------------- | ------ | ----------- | ------ | --------- | ----- | ------ |
| **Multi-Folder**           | ❌     | ⚠️ (Vaults) | ✅     | ✅        | N/A\* | ✅     |
| **Simultaneous View**      | ❌     | ❌          | ✅     | ✅        | ❌    | ✅     |
| **File Tree**              | ✅     | ✅          | ✅     | ✅        | ❌    | ✅     |
| **Workspace Save/Restore** | ❌     | ✅          | ⚠️     | ❌        | ❌    | ⚠️     |
| **Plain Text Files**       | ✅     | ✅          | ✅     | ✅        | ❌    | ⚠️     |
| **Drag & Drop**            | ✅     | ✅          | ✅     | ✅        | ❌    | ✅     |
| **Global Search**          | ✅     | ✅          | ✅     | ✅        | ✅    | ✅     |
| **Recent Items**           | ✅     | ✅          | ✅     | ✅        | ✅    | ✅     |
| **Pinning/Favorites**      | ✅     | ✅          | ❌     | ✅        | ❌    | ⚠️     |
| **Cloud Sync**             | ❌     | ⚠️          | ❌     | ✅        | ✅    | ✅     |
| **Mobile App**             | ❌     | ✅          | ❌     | ✅        | ✅    | ✅     |
| **Plugins**                | ❌     | ✅          | ⚠️     | ❌        | ❌    | ✅     |

\*Bear uses tags instead of folders

---

## 9. Lessons for Writer V6

### 9.1 Recommended Approach: Hybrid Model

Based on this analysis, Writer V6 should consider a **hybrid model** combining the best aspects:

```
Proposed Writer Workspace Model:
📁 Workspace (like Zettlr/Obsidian Vault)
├── 📂 Multiple Root Folders (like VS Code/Zettlr)
│   ├── 📁 Project A/
│   ├── 📁 Project B/
│   └── 📁 Reference/
├── 📄 Standalone Files (like Zettlr Root Files)
├── 💾 State Persistence (like Obsidian)
│   ├── Open folders
│   ├── Open files/tabs
│   ├── Split pane layouts
│   └── Scroll/cursor positions
└── ⚙️ Per-Workspace Settings
```

### 9.2 Critical Features to Implement

| Priority | Feature                      | Rationale                                                          |
| -------- | ---------------------------- | ------------------------------------------------------------------ |
| **P0**   | Multiple folder support      | Differentiates from Typora; matches user expectations from VS Code |
| **P0**   | File tree sidebar            | Essential for folder-based navigation                              |
| **P0**   | Recent folders/files         | Universal expectation across all editors                           |
| **P1**   | Workspace state save/restore | Power user feature from Obsidian/Zettlr                            |
| **P1**   | Drag & drop file management  | Standard interaction pattern                                       |
| **P1**   | Pinning/Favorites            | Keeps important folders accessible                                 |
| **P2**   | Global search                | Essential for larger workspaces                                    |
| **P2**   | Folder-specific settings     | Like Obsidian vault isolation                                      |

### 9.3 Design Decisions

#### Multi-Folder Support: YES

**Evidence:**

- Zettlr and iA Writer successfully implement this
- GitHub issue #2126 shows Typora users want it
- Matches modern IDE expectations (VS Code, JetBrains)

**Implementation:**

- Allow multiple root folders in sidebar
- Each folder maintains its own expansion state
- Cross-folder drag & drop supported

#### Workspace State Persistence: YES

**Evidence:**

- Obsidian's workspace.json pattern works well
- Zettlr restores open workspaces
- Users expect session restoration

**Implementation:**

- Save to `.writer/workspace.json` (hidden file)
- Include: open folders, open files, pane layouts, scroll positions
- Optional: Named workspace presets

#### Vault Isolation: OPTIONAL

**Evidence:**

- Obsidian's vault model is powerful but complex
- Most users don't need full isolation
- Per-folder settings may be sufficient

**Implementation:**

- Global settings as default
- Per-folder `.writer/settings.json` for overrides
- No forced isolation like Obsidian vaults

### 9.4 UX Recommendations

1. **Sidebar Structure:**

   ```
   📂 WORKSPACE
   ├── 📁 Folder 1 (expanded)
   │   ├── 📄 file.md
   │   └── 📁 subfolder/
   ├── 📁 Folder 2 (collapsed)
   └── 📄 standalone.md
   ```

2. **Recent Items:**
   - Separate "Recent Folders" and "Recent Files"
   - Pinning capability for frequently used
   - Clear history option

3. **Empty State:**
   - Welcome screen with "Open Folder" and "New File" options
   - Onboarding for first-time users

4. **Quick Actions:**
   - `Cmd/Ctrl+O` for quick file switcher
   - `Cmd/Ctrl+Shift+O` for recent folders
   - Search within workspace

---

## 10. Sources

### Official Documentation

1. [Typora File Management](https://support.typora.io/File-Management/)
2. [Obsidian Help - Manage Vaults](https://help.obsidian.md/Files+and+folders/Manage+vaults)
3. [Obsidian Data Storage](https://retypeapp.github.io/obsidian/data-storage/)
4. [Zettlr File Manager](https://docs.zettlr.com/en/file-manager/)
5. [Zettlr Workspaces](https://docs.zettlr.com/en/core/workspaces/)
6. [iA Writer Library](https://ia.net/writer/support/library)
7. [iA Writer Tree View](https://ia.net/topics/faster-filing-with-tree-view-a-step-forward-for-large-writing-projects)

### GitHub Issues

1. [Typora #2126 - Open Project (multiple folders)](https://github.com/typora/typora-issues/issues/2126)
2. [Typora #57 - File Navigator](https://github.com/typora/typora-issues/issues/57)
3. [Mark Text #2222 - Multiple folders](https://github.com/marktext/marktext/issues/2222)

### Community Discussions

1. [Obsidian Forum - Multiple vaults](https://forum.obsidian.md/t/one-vault-vs-multiple-vaults/1445)
2. [Bear Community - Workspaces](https://community.bear.app/t/why-we-need-workspaces/9320)

---

## 11. Appendix: Terminology Comparison

| Concept            | Typora    | Obsidian  | Zettlr    | iA Writer | Bear | Joplin       |
| ------------------ | --------- | --------- | --------- | --------- | ---- | ------------ |
| **Root Container** | Folder    | Vault     | Workspace | Library   | -    | Notebook     |
| **Subdivision**    | Subfolder | Folder    | Folder    | Folder    | Tag  | Sub-notebook |
| **Quick Access**   | Pin       | Star      | -         | Favorite  | -    | -            |
| **Session**        | Recent    | Workspace | -         | -         | -    | -            |

---

_Document prepared for Writer V6 Workspace Feature Design_  
_Last Updated: March 8, 2026_
