# editor-history

## Quick Read

- **id**: `editor-history`
- **name**: 编辑器撤销/重做历史
- **summary**: 管理编辑器 undo/redo 历史栈的生命周期，确保历史栈与当前打开文档的身份严格对齐
- **scope**: 包括 undo/redo 快捷键、history 栈初始化/重置规则、文档加载不进入历史、文件切换清栈；不包括 autosave 脏标记、文件系统持久化
- **entry_points**:
  - useUndoRedo hook（Mod-z / Mod-y / Mod-Shift-z）
  - editor.commands.loadDocument（文档加载专用命令，待实现）
  - ProseMirror history 插件（由 StarterKit 提供）
- **shared_with**: autosave（共享"用户编辑 vs 程序加载"的区分语义）
- **check_on_change**:
  - 初次打开文件后 undo 栈为空
  - 文件 A→B 切换后，B 的 undo 栈与 A 完全隔离
  - 程序化内容加载不产生可撤销步骤
- **last_verified**: 2026-04-10

---

## Capability Summary

Writer 使用 Tiptap 3.x 的 StarterKit，其内部依赖 ProseMirror `history` 插件维护 undo/redo 栈（默认深度 100）。本能力的核心约束是：**history 栈的生命周期必须与当前打开文档的 identity 严格对齐**——只有用户的真实编辑才应进入栈，任何"程序化文档加载"都不得污染栈；当 activeFile 变化时，栈必须彻底清空，不得跨文件残留。

历史栈污染会导致两类严重数据事故：

1. **初次打开即按 Ctrl+Z 清空全文**：加载动作被误作一次编辑压栈，用户首次 undo 直接把文档变成空
2. **跨文件 undo 穿透**：在 A 编辑形成栈后切到 B，按 Ctrl+Z 将 B 的内容变成 A 的历史片段

本能力的所有规则围绕"防止上述两类事故"展开。

---

## Entries

| Entry              | Trigger                      | Evidence                                                                                           | Notes                                                |
| ------------------ | ---------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| useUndoRedo        | Mod-z / Mod-y / Mod-Shift-z  | `src/domains/editor/extensions/findReplaceShortcuts.ts:29-40`、`src/domains/editor/hooks/useUndoRedo.ts` | 调用 editor.chain().focus().undo/redo().run()        |
| StarterKit history | 编辑器初始化                  | `src/domains/editor/core/EditorImpl.tsx:205`                                                       | 由 StarterKit 默认启用，depth=100                     |
| loadDocument 扩展  | activeFile 变化时加载内容    | `src/domains/editor/extensions/loadDocument.ts:42-90`                                             | 封装"解析 + 替换 doc + 不入栈 + 清栈"               |

---

## Current Rules

### CR-001: history 深度 100

ProseMirror history 插件使用 StarterKit 默认配置，depth=100，newGroupDelay=500ms。如无明确理由，不得修改该默认值。

**Evidence**: StarterKit 默认值，`src/domains/editor/core/EditorImpl.tsx:205`

---

### CR-002: 程序化文档加载不进入 history 栈

任何非"用户真实键入/命令操作"产生的文档内容变更，必须在 transaction 上标记 `addToHistory: false`，禁止成为可撤销步骤。典型场景：

- 打开文件加载初始内容
- 文件切换替换内容
- 未来可能新增的外部写入路径（AI 重写、版本回溯、模板插入等）

**Evidence**: 本能力约束，由 loadDocument 扩展强制执行

---

### CR-003: activeFile 变化时必须清空 undo/redo 栈

当编辑器从文件 A 切换到文件 B（activeFile identity 变化）时，必须在加载 B 内容的同一个 tick 内清空 undo 栈和 redo 栈。禁止跨文件保留历史，防止 undo 穿透到另一个文件的内容。

**Evidence**: `src/domains/editor/extensions/loadDocument.ts:64-84`。实现方式：在 dispatch 替换 transaction 之后，同步调用 `editor.unregisterPlugin('history')` 卸载 ProseMirror history 插件（Tiptap `unregisterPlugin` 按 `history$` key 前缀匹配），再 `editor.registerPlugin(history({ depth: 100, newGroupDelay: 500 }))` 注册一个全新的 history 插件。全部走 Tiptap 公开 API，不依赖 prosemirror-history 任何内部 key。回归：`src/domains/editor/__tests__/editorHistory.test.ts` 中 `CR-003: switching files wipes undo history...` 用例。

---

### CR-004: undo/redo 快捷键绑定

- `Mod-z` → undo
- `Mod-y` → redo
- `Mod-Shift-z` → redo

**Evidence**: `src/domains/editor/extensions/findReplaceShortcuts.ts:29-40`

---

### CR-005: 文档加载路径唯一化

编辑器的"文档内容加载"动作必须全部走 `editor.commands.loadDocument(json)`，**禁止**任何外部调用方直接使用 `editor.commands.setContent()` 加载文件内容。`setContent` 仅保留给 Tiptap/ProseMirror 内部、单元测试 fixture 构造，以及明确不涉及文件身份的局部插入场景使用。

**理由**：把 history 隔离约束收敛到单一入口，避免未来新增加载路径时重复踩同一个坑。该规则是强约束，code review 时须专项检查。

**Evidence**: 本能力约束

---

### CR-006: loadDocument 同时承担"不触发 autosave"语义

loadDocument 在替换文档内容时，除了设置 `addToHistory: false`，还必须保留当前 `setContent(..., { emitUpdate: false })` 的语义——不触发 Tiptap 的 `onUpdate` 回调，从而不产生脏标记、不触发 autosave 写盘。本规则与 `autosave` capability 共享同一语义："程序化加载 ≠ 用户编辑"。

**Evidence**: 本能力约束；`autosave` capability 中的脏标记触发链

---

## Impact Surface

| Area                           | What to check                                        | Evidence                                                         |
| ------------------------------ | ---------------------------------------------------- | ---------------------------------------------------------------- |
| loadDocument 扩展              | 正确设置 addToHistory=false、清栈、不触发 onUpdate   | `src/domains/editor/extensions/loadDocument.ts:42-90`            |
| EditorImpl useEffect([activeFile]) | 调用 loadDocument 而非 setContent                | `src/domains/editor/core/EditorImpl.tsx:405-425`                 |
| useUndoRedo                    | 快捷键无误触、focus 正确                             | `src/domains/editor/hooks/useUndoRedo.ts`                        |
| StarterKit 配置                | history 未被禁用，depth 未被误改                     | `src/domains/editor/core/EditorImpl.tsx:205`                     |
| 回归测试                       | 首次加载后 undo 不清空、跨文件 undo 不穿透           | `src/domains/editor/__tests__/editorHistory.test.ts`             |

---

## Shared Rules Dependency

| Shared Rule                          | Dependency                                                                              | Lifted |
| ------------------------------------ | --------------------------------------------------------------------------------------- | ------ |
| autosave "用户编辑 vs 程序加载" 区分 | loadDocument 同时承担"不进栈"与"不触发 autosave"双重职责，与 autosave 的脏标记链互斥  | no     |

---

## Uncertainties

- None. 实施窗口 2026-04-10 选定"unregister/registerPlugin 重建 history 插件"方案，详见 CR-003 Evidence。

---

## Known Consumers

| Consumer    | Usage                                           | Evidence                                           |
| ----------- | ----------------------------------------------- | -------------------------------------------------- |
| EditorImpl  | 首次加载、切换文件时调用 loadDocument           | `src/domains/editor/core/EditorImpl.tsx:405-425`   |
| useUndoRedo | 消费 editor 的 undo/redo 命令                   | `src/domains/editor/hooks/useUndoRedo.ts`          |

---

## Archive Pointer

- None. This is a first-version capability document.
