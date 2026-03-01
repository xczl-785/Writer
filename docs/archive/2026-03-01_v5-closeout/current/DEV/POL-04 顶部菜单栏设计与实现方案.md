# POL-04 顶部菜单栏设计与实现方案

**日期**: 2026-03-01  
**阶段**: V5 功能打磨（POL-04）  
**负责人**: Deep

---

## 1. 目标与范围

基于 `docs/current/UI/UI_UX规范.md` 第 4 章，落地 Tauri 原生顶部菜单：

1. 分类完整：`File / Edit / Paragraph / Format / View`
2. 菜单动作与现有编辑器行为一致（同一命令同一结果）
3. 快捷键映射与菜单文案一致
4. 不破坏现有“顶栏极简”（UI 顶部仍仅面包屑 + 大纲按钮）

---

## 2. 当前代码基线（事实）

1. Rust 端尚未构建任何 Tauri Native Menu（`src-tauri/src/lib.rs` 仅 `invoke_handler`）。
2. 前端编辑能力存在可复用命令集：
   - `TOOLBAR_COMMANDS`（加粗/斜体/标题1-6/列表/引用/代码块）
   - `find/replace`、`undo/redo` 快捷键扩展
   - `Sidebar` 已有新建/新建文件夹/重命名/删除命令
3. 缺少统一“全局命令总线”：
   - 当前编辑命令在 `Editor` 内部闭包执行，外部（菜单）无法直接调用

---

## 3. 方案对比

### 方案 A：Rust 菜单 -> Window 事件 -> 前端命令总线（推荐）

- 优点：
  - 原生菜单与 Web 编辑逻辑解耦
  - 易于分阶段上线（先 P0 高价值命令）
  - 可在前端统一做可用性判定与降级提示
- 风险：
  - 需要新增一层 Command Bus

### 方案 B：Rust 菜单直接调用 Rust 侧业务逻辑

- 问题：
  - 编辑器状态在前端 TipTap，Rust 端无法直接执行富文本命令
- 结论：
  - 不可行，不采用

---

## 4. 推荐架构（A）

```text
Tauri Native Menu Click
  -> Rust on_menu_event (menu_id)
  -> emit to frontend: writer://menu-command { id }
  -> Frontend MenuCommandBus.dispatch(id)
  -> domain handler (editor/workspace/view)
  -> 状态栏提示 + 行为执行
```

### 4.1 新增模块

1. `src-tauri/src/menu.rs`
   - 构建菜单树
   - 统一 menu id 常量（如 `menu.file.new`）
2. `src/ui/commands/menuCommandBus.ts`
   - 注册/注销 handler
   - `dispatch(id)` 与兜底提示
3. `src/app/useNativeMenuBridge.ts`
   - 监听 `writer://menu-command`
   - 转发到 `menuCommandBus`

### 4.2 与现有模块对接

1. `Editor.tsx`
   - 在 mount 时注册编辑命令 handler（格式、段落、查找）
2. `Sidebar.tsx` / workspace
   - 注册文件类命令 handler（新建、打开文件夹、关闭文件夹、重命名、删除）
3. `App.tsx`
   - 初始化菜单桥接监听

---

## 5. 菜单分类与命令映射（V5 第一版）

> 标记说明：  
> `READY` = 现有能力直接可复用  
> `ADAPT` = 需轻量适配/封装  
> `STUB` = 先展示入口，点击提示 `coming soon`

### 5.1 File

1. New (`Cmd+N`) - `ADAPT`（调用 Sidebar 创建文件）
2. Open Folder (`Cmd+O`) - `READY`（已有 `openWorkspace`）
3. Close Folder (`Shift+Cmd+W`) - `ADAPT`（清空 workspace 路径与打开文件状态）
4. Save (`Cmd+S`) - `ADAPT`（触发当前文件 flush/write）
5. Save As (`Shift+Cmd+S`) - `STUB`
6. Export PDF / HTML / Image - `STUB`

### 5.2 Edit

1. Undo / Redo - `READY`
2. Cut / Copy / Paste - `ADAPT`（前端 clipboard）
3. Select All - `READY`
4. Find / Replace (`Cmd+F`) - `READY`（已支持 find/replace panel）

### 5.3 Paragraph

1. Heading 1~6 - `READY`
2. Blockquote - `READY`
3. Code Block - `READY`
4. Table - `READY`
5. Ordered / Unordered List - `READY`
6. Task List - `ADAPT`（当前未显式命令，需补）
7. Horizontal Rule - `ADAPT`（需补命令）
8. Math Block - `STUB`

### 5.4 Format

1. Bold / Italic / Inline Code - `READY`
2. Strikethrough - `ADAPT`（Bubble 内有，需纳入总线）
3. Underline - `STUB`（当前扩展无）
4. Highlight - `STUB`（当前为占位）
5. Link - `STUB`（当前为占位）
6. Image - `ADAPT`（可触发插图流程）

### 5.5 View

1. Toggle Outline (`Shift+Cmd+O`) - `READY`
2. Toggle Sidebar (`Cmd+\\`) - `ADAPT`（当前按钮占位，需补状态）
3. Focus Mode (`F11`) - `STUB`
4. Source Mode (`Cmd+/`) - `STUB`

---

## 6. 关闭环与容错策略

1. 无当前文件时：
   - 编辑类命令返回 `unavailable`，状态栏提示
2. 命令不可执行时：
   - 不抛错，统一提示 `X unavailable`
3. Web 模式（非 Tauri）：
   - 菜单桥接不启用，不影响现有快捷键

---

## 7. 分阶段落地计划

### 阶段 P0-1（骨架）

1. Rust Native Menu + id 定义
2. 前端事件桥接 + Command Bus
3. 接通 12 个核心命令（Open Folder/Close Folder/Save/Undo/Redo/Find/Heading1/Bold/Italic/Outline/Sidebar/New）

> 进度：✅ 已完成（提交：`7a69e7c`）

### 阶段 P0-2（完整映射）

1. File/Edit/Paragraph/Format/View 全部菜单项接入
2. READY / ADAPT 项全部可用
3. STUB 项统一 `coming soon`

> 进度：✅ 已完成（提交：`b672c28`）  
> 当前实现：  
> - 已可用：Open/Close Folder、Save、Undo/Redo、Cut/Copy/Paste、Find/Replace、Heading1~6、List、Blockquote、Code Block、Table、Horizontal Rule、Strikethrough、Outline、Toggle Sidebar  
> - 暂时占位（STUB）：Save As、Export、Math Block、Underline、Highlight、Link、Image、Focus Mode、Source Mode

### 阶段 P0-3（回归）

1. 快捷键一致性检查
2. 平台差异记录（macOS/Windows）
3. 更新进度板与留档

> 进度：🚧 进行中

---

## 10. 菜单 ID 清单（当前实现）

### File

- `menu.file.new`
- `menu.file.open_folder`
- `menu.file.close_folder`
- `menu.file.save`
- `menu.file.save_as`
- `menu.file.export_pdf`
- `menu.file.export_html`
- `menu.file.export_image`

### Edit

- `menu.edit.undo`
- `menu.edit.redo`
- `menu.edit.cut`
- `menu.edit.copy`
- `menu.edit.paste`
- `menu.edit.select_all`
- `menu.edit.find`
- `menu.edit.replace`

### Paragraph

- `menu.paragraph.heading_1`
- `menu.paragraph.heading_2`
- `menu.paragraph.heading_3`
- `menu.paragraph.heading_4`
- `menu.paragraph.heading_5`
- `menu.paragraph.heading_6`
- `menu.paragraph.blockquote`
- `menu.paragraph.code_block`
- `menu.paragraph.table`
- `menu.paragraph.unordered_list`
- `menu.paragraph.ordered_list`
- `menu.paragraph.task_list`
- `menu.paragraph.horizontal_rule`
- `menu.paragraph.math_block`

### Format

- `menu.format.bold`
- `menu.format.italic`
- `menu.format.inline_code`
- `menu.format.strike`
- `menu.format.underline`
- `menu.format.highlight`
- `menu.format.link`
- `menu.format.image`

### View

- `menu.view.outline`
- `menu.view.toggle_sidebar`
- `menu.view.focus_mode`
- `menu.view.source_mode`

---

## 8. 验收标准（POL-04）

1. 五大菜单分类完整显示
2. 至少 80% 的 READY/ADAPT 项可执行
3. 菜单动作与快捷键动作结果一致
4. 不可执行项有明确提示，不出现 silent fail
5. 文档留档（菜单 ID 清单、平台差异）

---

## 9. 待 PO 确认项

1. `Save As` 与 `Export` 是否允许在 V5 先全部 `STUB`？
2. `Math Block`、`Underline`、`Highlight`、`Link` 是否统一先 `STUB`？
3. `Cmd+/`（Source Mode）是否与现有 Slash/注释类快捷键冲突策略采用“菜单优先占位、功能后补”？
