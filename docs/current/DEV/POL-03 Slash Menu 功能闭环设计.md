# POL-03 Slash Menu 功能闭环设计

**日期**: 2026-03-01  
**阶段**: V5 功能打磨（POL-03）  
**负责人**: Deep

---

## 1. 目标

在不打断写作心流的前提下，完成 Slash Menu 的完整闭环：

1. 打开（`/` 触发）
2. 搜索（输入搜索词，不污染正文）
3. 选中（键盘/鼠标）
4. 执行（命令落地）
5. 关闭（Esc/删除到空/光标离开）

核心原则：

- 搜索词属于**临时命令碎片（Command Fragment）**，不写入文档。
- `/` 被删除时，Slash Menu 必须关闭。
- 行内范围型语法（加粗、斜体、行内代码）不进入 Slash，保持 Bubble Menu 职责。

---

## 2. 当前实现主要问题

1. Slash 查询词虽然不入文档，但状态流尚未定义“搜索阶段”。
2. Backspace 逻辑不够语义化：未区分“删查询词”和“删触发符 `/`”。
3. 未明确 IME（中文输入法）组合输入阶段处理。
4. 命令范围尚未冻结，后续扩展容易破坏一致性。
5. 缺少完整的验收矩阵（打开/关闭/选中/执行全路径）。

---

## 3. 交互边界（必须遵守）

### 3.1 触发边界

Slash Menu 仅在以下条件触发：

- 编辑器聚焦
- 光标为折叠态（无选区）
- 当前块为空行（或仅空白字符）
- 输入字符为 `/`

不触发条件：

- 有选区
- 非空块中间输入 `/`
- 代码块内（可选：V5 建议禁用，避免与代码输入冲突）

### 3.2 文本污染边界

- 触发后，正文不应出现真实搜索词。
- `query` 全部放在 UI 层状态。
- 执行命令后，不残留 `/query`。

### 3.3 关闭边界

应关闭：

- `Esc`
- 点击菜单外部
- 光标失焦
- 删除查询词到空后，再次 Backspace 删除 `/`

不应关闭：

- 输入可打印字符（继续搜索）
- 上下键切换项

---

## 4. 状态机设计

```text
IDLE
  └─(on "/" and trigger-eligible)→ OPENED(query="", anchor)

OPENED
  ├─(printable char)→ SEARCHING(query=+char)
  ├─(Esc / blur / outside click)→ IDLE
  ├─(Backspace when query="")→ IDLE   // 等价删除 "/"
  ├─(ArrowUp/Down)→ OPENED (activeIndex change)
  └─(Enter with active item)→ EXECUTING → IDLE

SEARCHING
  ├─(printable char)→ SEARCHING(query=append)
  ├─(Backspace and query length>0)→ SEARCHING(query=trim)
  ├─(Backspace and query becomes empty)→ OPENED(query="")
  ├─(Backspace again when query="")→ IDLE
  ├─(Esc / blur / outside click)→ IDLE
  └─(Enter with active item)→ EXECUTING → IDLE
```

---

## 5. 输入模型（重点）

### 5.1 搜索阶段模型

- 输入 `/` 后进入 **搜索阶段**。
- 所有后续输入字符只写入 `slashState.query`。
- 正文只保留触发光标位置，不插入 `query` 文本。

### 5.2 删除行为

1. `query.length > 0` 时 Backspace：只删 `query` 最后 1 字符。
2. `query.length === 0` 时 Backspace：视为删除 `/`，菜单关闭。

### 5.3 IME 规则

- 组合输入期间（`compositionstart`~`compositionend`）不立即过滤。
- `compositionend` 一次性提交到 `query`。
- 防止中文输入时菜单频繁抖动。

---

## 6. 命令范围冻结（V5）

## 6.1 纳入 Slash（块级/插入型）

- Heading 1~3（后续可扩 4~6）
- Unordered List
- Ordered List
- Task List
- Blockquote
- Code Block
- Table
- Horizontal Rule

## 6.2 不纳入 Slash（行内范围型）

- Bold / Italic / Strikethrough / Highlight / Inline Code / Link

原因：这些语法依赖选区，属于 Bubble Menu 职责。

## 6.3 暂缓（V5 不做）

- Footnote / Definition List / Sup/Sub / HTML Block 等低频或兼容性不稳项

---

## 7. 键盘与鼠标规范

- `ArrowDown`：下一项（循环）
- `ArrowUp`：上一项（循环）
- `Enter`：执行当前高亮项
- `Tab`：与 `ArrowDown` 同义（可选）
- `Esc`：关闭
- 鼠标悬停：更新 activeIndex
- 鼠标点击项：执行 + 关闭

---

## 8. 执行后行为

执行命令后必须：

1. 菜单关闭
2. 查询状态清空
3. 光标移动到命令期望位置（例如插入表格后进入首格）
4. 状态栏反馈（可选：短暂提示命令名）

---

## 9. 异常与降级

1. 无匹配项：
- 显示 `No matching commands`
- Enter 不执行，仅保留菜单

2. 命令执行失败：
- 菜单关闭
- 状态栏报错（ErrorService）

3. 编辑器实例为空：
- 忽略触发，直接返回

---

## 10. 性能预算

- 打开延迟：< 100ms
- 过滤延迟：< 16ms（单帧）
- 命令列表默认最多渲染 8~10 条（当前 8 条）

---

## 11. 验收标准（POL-03）

1. `/` 在空行触发，非空文本中不触发。
2. 输入查询词不写入正文。
3. Backspace 先删查询词，再删 `/` 并关闭菜单。
4. Esc、外部点击、失焦都能关闭。
5. 键盘上下与 Enter 执行稳定。
6. 命令执行后光标和文档状态正确。
7. 全链路回归通过（中英文输入、长文档、快速操作）。

---

## 12. 执行分解（下一步开发）

1. 重构 Slash 状态机为显式 phase（idle/open/searching/executing）
2. 接入 IME 事件与输入合流
3. 命令清单冻结并补齐 Task List / HR
4. 补充单元测试与交互回归测试
5. 与 POL-04 顶部菜单共享命令元数据（避免双份定义）

