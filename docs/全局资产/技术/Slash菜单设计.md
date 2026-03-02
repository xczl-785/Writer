# Slash Menu 设计规范

**更新日期**: 2026-03-02
**实现文件**: `src/ui/editor/menus/SlashMenu.tsx`

---

## 一、功能定位

Slash Menu 是通过 `/` 触发的命令面板，用于快速插入块级 Markdown 元素。

**设计原则**：

- 不打断写作心流，搜索词不写入文档
- 仅包含**块级/插入型**语法
- 行内范围型语法由 Bubble Menu 负责

---

## 二、触发条件

### 2.1 触发边界（严格模式）

| 条件       | 说明                                     |
| ---------- | ---------------------------------------- |
| 编辑器聚焦 | `editor.isFocused === true`              |
| 光标折叠   | `selection.empty === true`               |
| 顶级段落   | `$from.depth === 1`                      |
| 段落类型   | `$from.parent.type.name === 'paragraph'` |
| 段落为空   | `$from.parent.content.size === 0`        |
| 非代码块内 | `!editor.isActive('codeBlock')`          |

### 2.2 触发字符

- 半角 `/`
- 全角 `／`

### 2.3 不触发场景

- 有选区时
- 非空段落中输入 `/`
- 代码块内
- 编辑器失焦时

---

## 三、命令范围定义

### 3.1 纳入 Slash Menu（块级/插入型）

| 命令            | 语法类型  | 分类                | 快捷键 | 实现状态  |
| --------------- | --------- | ------------------- | ------ | --------- |
| Heading 1       | 基础      | Basic Blocks        | ⌘1     | ✅ 已实现 |
| Heading 2       | 基础      | Basic Blocks        | ⌘2     | ❌ 未实现 |
| Heading 3       | 基础      | Basic Blocks        | ⌘3     | ❌ 未实现 |
| Heading 4       | 基础      | Basic Blocks        | ⌘4     | ❌ 未实现 |
| Heading 5       | 基础      | Basic Blocks        | ⌘5     | ❌ 未实现 |
| Heading 6       | 基础      | Basic Blocks        | ⌘6     | ❌ 未实现 |
| Unordered List  | 基础      | Basic Blocks        | ⌥⌘U    | ✅ 已实现 |
| Ordered List    | 基础      | Basic Blocks        | ⌥⌘O    | ✅ 已实现 |
| Task List       | 扩展(GFM) | Basic Blocks        | -      | ❌ 未实现 |
| Blockquote      | 基础      | Advanced Components | ⇧⌘Q    | ✅ 已实现 |
| Code Block      | 基础      | Advanced Components | ⌥⌘C    | ✅ 已实现 |
| Table           | 扩展(GFM) | Advanced Components | ⌥⌘T    | ✅ 已实现 |
| Horizontal Rule | 基础      | Advanced Components | -      | ❌ 未实现 |
| Image           | 基础      | Advanced Components | -      | ❌ 未实现 |

### 3.2 不纳入 Slash Menu（行内范围型）

| 语法          | 原因                     | 负责组件    |
| ------------- | ------------------------ | ----------- |
| Bold          | 依赖选区，选中文字后操作 | Bubble Menu |
| Italic        | 依赖选区                 | Bubble Menu |
| Strikethrough | 依赖选区                 | Bubble Menu |
| Highlight     | 依赖选区                 | Bubble Menu |
| Inline Code   | 依赖选区                 | Bubble Menu |
| Link          | 依赖选区                 | Bubble Menu |
| Subscript     | 低频用法，暂不纳入       | -           |
| Superscript   | 低频用法，暂不纳入       | -           |

### 3.3 暂缓纳入（V5 后续评估）

| 语法            | 原因                           |
| --------------- | ------------------------------ |
| Footnote        | 兼容性问题，需 TipTap 扩展支持 |
| Definition List | 兼容性问题，非 GFM 标准        |
| HTML Block      | 安全性考虑，暂不支持           |

---

## 四、交互行为

### 4.1 状态机

```
IDLE
  └─(输入 "/" 且符合触发条件)→ OPEN

OPEN
  ├─(输入字符)→ SEARCHING
  ├─(Esc / 点击外部 / 失焦)→ IDLE
  ├─(Backspace)→ IDLE（删除 "/"）
  ├─(ArrowUp/Down)→ OPEN（切换选中项）
  └─(Enter)→ EXECUTING → IDLE

SEARCHING
  ├─(输入字符)→ SEARCHING（追加查询词）
  ├─(Backspace 有查询词)→ SEARCHING（删除末字符）
  ├─(Backspace 查询词为空)→ OPEN
  ├─(Esc / 点击外部 / 失焦)→ IDLE
  └─(Enter 有匹配项)→ EXECUTING → IDLE
```

### 4.2 键盘导航

| 按键      | 行为                  |
| --------- | --------------------- |
| ArrowDown | 下一项（循环）        |
| ArrowUp   | 上一项（循环）        |
| Tab       | 与 ArrowDown 同义     |
| Enter     | 执行当前高亮项        |
| Escape    | 关闭菜单              |
| Backspace | 删除查询词 / 关闭菜单 |

### 4.3 鼠标交互

| 操作         | 行为           |
| ------------ | -------------- |
| 悬停         | 更新高亮项     |
| 点击         | 执行命令并关闭 |
| 点击菜单外部 | 关闭菜单       |

### 4.4 IME 处理

- `compositionstart` 期间不立即过滤
- `compositionend` 时一次性提交到查询词
- 防止中文输入时菜单抖动

---

## 五、UI 规范

### 5.1 菜单位置

- 水平：光标位置
- 垂直：光标下方 8px
- 边界：超出视口时自动调整

### 5.2 命令分组

| 分组                | 包含命令                                              |
| ------------------- | ----------------------------------------------------- |
| Basic Blocks        | Heading 1~6, Unordered List, Ordered List, Task List  |
| Advanced Components | Blockquote, Code Block, Table, Horizontal Rule, Image |

### 5.3 搜索过滤

- 最大显示项数：8
- 匹配字段：`label` + `keywords`
- 无匹配时显示：`No matching commands`

### 5.4 Ghost Hint

空行时显示提示：`/ 输入以唤出菜单...`

---

## 六、命令元数据

### 6.1 Basic Blocks

```typescript
{ id: 'heading1', label: 'Heading 1', hint: '⌘1', keywords: ['h1', 'title'] }
{ id: 'heading2', label: 'Heading 2', hint: '⌘2', keywords: ['h2'] }
{ id: 'heading3', label: 'Heading 3', hint: '⌘3', keywords: ['h3'] }
{ id: 'heading4', label: 'Heading 4', hint: '⌘4', keywords: ['h4'] }
{ id: 'heading5', label: 'Heading 5', hint: '⌘5', keywords: ['h5'] }
{ id: 'heading6', label: 'Heading 6', hint: '⌘6', keywords: ['h6'] }
{ id: 'unorderedList', label: 'Unordered List', hint: '⌥⌘U', keywords: ['list', 'bullet', 'ul'] }
{ id: 'orderedList', label: 'Ordered List', hint: '⌥⌘O', keywords: ['list', 'number', 'ol'] }
{ id: 'taskList', label: 'Task List', hint: '', keywords: ['task', 'todo', 'checkbox'] }
```

### 6.2 Advanced Components

```typescript
{ id: 'blockquote', label: 'Blockquote', hint: '⇧⌘Q', keywords: ['quote'] }
{ id: 'codeBlock', label: 'Code Block', hint: '⌥⌘C', keywords: ['code', 'pre'] }
{ id: 'table', label: 'Table', hint: '⌥⌘T', keywords: ['table', 'grid'] }
{ id: 'horizontalRule', label: 'Horizontal Rule', hint: '', keywords: ['hr', 'divider', 'line'] }
{ id: 'image', label: 'Image', hint: '', keywords: ['img', 'picture', 'photo'] }
```

---

## 七、实现进度

| 命令            | 状态      | 备注               |
| --------------- | --------- | ------------------ |
| Heading 1       | ✅ 已实现 | -                  |
| Heading 2       | ✅ 已实现 | -                  |
| Heading 3       | ✅ 已实现 | -                  |
| Heading 4       | ✅ 已实现 | -                  |
| Heading 5       | ✅ 已实现 | -                  |
| Heading 6       | ✅ 已实现 | -                  |
| Unordered List  | ✅ 已实现 | -                  |
| Ordered List    | ✅ 已实现 | -                  |
| Task List       | ✅ 已实现 | -                  |
| Blockquote      | ✅ 已实现 | -                  |
| Code Block      | ✅ 已实现 | -                  |
| Table           | ✅ 已实现 | -                  |
| Horizontal Rule | ✅ 已实现 | -                  |
| Image           | ✅ 已实现 | 文件选择对话框插入 |

---

## 八、参考资源

- [POL-03 Slash Menu 功能闭环设计](../../archive/2026-03-01_v5-closeout/current/DEV/POL-03%20Slash%20Menu%20功能闭环设计.md)
- [Markdown 语法完全指南](../../参考资料/Markdown语法完全指南.md)
