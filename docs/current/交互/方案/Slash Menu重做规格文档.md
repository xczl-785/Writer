# Writer V5 Slash Menu 重构规格（完整重做版）

最后更新：2026-03-05  
状态：待开发（用于替换现有 `src/ui/editor/menus/SlashMenu.tsx`）

---

## 1. 文档目的

本规格是 Slash Menu 的**重构蓝图**，目标不是补丁修复，而是：

1. 清除当前实现的状态耦合与事件分散问题，降低代码熵。
2. 建立可测试、可扩展、可维护的统一交互协议。
3. 保证与 Zen / Focus Zen / Find Panel / IME 的协作稳定。
4. 对应并覆盖当前测试中暴露的问题（尤其模块 E）。

---

## 2. 当前问题诊断（基于代码交叉审阅）

对应代码：`src/ui/editor/menus/SlashMenu.tsx`、`src/ui/editor/Editor.tsx`。

### 2.1 结构性问题

1. `useSlashMenu` 同时承担：触发判定、输入管理、状态机、DOM 事件注册、坐标初始计算。
2. `SlashMenu` 组件同时承担：布局计算、高度测量、滚动控制、渲染。
3. 逻辑边界不清：输入通道（beforeinput/composition/keydown）存在分散处理，理解成本高。

### 2.2 可维护性风险

1. 事件处理依赖多个闭包状态，重构和排错成本高。
2. 布局算法与渲染生命周期耦合（估算高度 + 实测回写）。
3. 缺少“统一协议层”定义，导致跨模块 Esc/浮层优先级只能靠分散条件判断。

### 2.3 已知现象（来自测试）

1. 上翻场景仍可能遮挡输入行（E02/E09）。
2. 小窗口中键盘选择项与菜单滚动联动不稳定（E03/E05）。
3. 相关交互改动容易引入回归，说明当前实现改动面过大。

---

## 3. 重构目标与非目标

### 3.1 重构目标（In Scope）

1. 重写 Slash Menu 触发、状态、布局、滚动、执行全链路。
2. 抽离纯函数计算层（布局/滚动/过滤/状态转移）。
3. 明确 IME、Esc、外部点击、失焦等统一关闭协议。
4. 建立完整测试矩阵（单测 + 集成 + 手测映射）。

### 3.2 非目标（Out of Scope）

1. 命令池扩容（沿用现有命令集合）。
2. 视觉主题重做（保持 V5 视觉参数）。
3. 编辑器快捷键体系重构。

---

## 4. 重构设计原则

1. 单一职责：输入会话、布局、渲染、命令执行解耦。
2. 纯函数优先：关键算法可脱离 React 生命周期独立测试。
3. 单向数据流：UI 不自行推导业务状态，只消费状态机输出。
4. 事件仲裁明确：Esc 与多浮层冲突要有固定优先级。
5. 可观察性：关键路径具备统一日志/调试开关（开发态）。

---

## 5. 目标架构

建议拆分为 5 层：

1. `slashSessionMachine.ts`
- 定义状态机（idle/open/searching/executing）。
- 输入动作：`OPEN`、`APPEND_QUERY`、`DELETE_QUERY`、`MOVE_NEXT`、`MOVE_PREV`、`SUBMIT`、`CLOSE`。

2. `slashEligibility.ts`
- 保留严格触发判定（顶级空段落、非 code block、折叠光标、聚焦）。

3. `slashLayout.ts`
- `computeSlashMenuLayout(input): layout`
- 负责下翻/上翻/右边界/低视口内滚策略。

4. `slashScroll.ts`
- `computeKeyboardScrollTop(input): number | null`
- 负责“提前滚动安全带”算法。

5. `SlashMenuView.tsx`
- 纯渲染层，接收状态和回调，不包含业务判断。

---

## 6. 数据模型与状态机

### 6.1 核心状态

```ts
type SlashPhase = 'idle' | 'open' | 'searching' | 'executing';

type SlashSession = {
  phase: SlashPhase;
  query: string;
  selectedIndex: number;
  anchorRect: { left: number; top: number; bottom: number } | null;
  source: 'keyboard' | 'ime';
};
```

### 6.2 状态转移

1. `idle -> open`
- 满足严格触发条件，收到 `/` 或 `／`。

2. `open -> searching`
- 接收到可过滤字符。

3. `searching -> open`
- 删除到空 query。

4. `open/searching -> executing -> idle`
- Enter/点击执行命令后关闭。

5. `open/searching -> idle`
- Esc、外部点击、失焦、上下文失效（选区变化导致不再合法）。

### 6.3 状态约束

1. `selectedIndex` 始终在 `filteredCommands` 范围内。
2. `phase=idle` 时 `query` 必须为空。
3. `filteredCommands.length=0` 时 Enter 不执行命令，仅关闭或保持（按产品确认，建议关闭）。

---

## 7. 触发与输入协议

### 7.1 严格触发（保留）

必须同时满足：

1. 编辑器聚焦。
2. 折叠光标。
3. 顶级空段落。
4. 非 code block。
5. 输入字符是 `/` 或 `／`。

### 7.2 输入通道统一规则

1. `beforeinput` 为主通道（插入/删除）。
2. `compositionstart/end` 只负责 IME 会话边界，不重复写入 query。
3. `keydown` 只处理导航键（↑ ↓ Tab Enter Esc），不处理文本录入。

### 7.3 IME 规则

1. 组合输入过程中，不触发逐字符过滤。
2. `compositionend` 后按一次提交文本处理。
3. 防止“已提交文本 + query 再追加”导致重复。

---

## 8. 命令模型

命令集合沿用现有分组：

1. Basic：Heading1~6、UnorderedList、OrderedList、TaskList。
2. Advanced：Blockquote、CodeBlock、Table、HorizontalRule、Image。

过滤规则：

1. `label` 包含匹配。
2. `keywords` 包含匹配。
3. `zh-CN` 支持拼音匹配（`pinyin-pro`）。
4. 最大显示条数：14。

---

## 9. 布局与定位算法（重构版硬规范）

### 9.1 常量

- `MENU_WIDTH = 260`
- `EDGE_PADDING = 10`
- `FLIP_THRESHOLD = 500`
- `LOW_VIEWPORT_THRESHOLD = 500`
- `FLIP_SAFE_GAP = 48`（上翻安全间隙，较当前实现加大）

### 9.2 默认下翻

- `top = anchor.bottom + 8`
- `left = clamp(anchor.left, EDGE_PADDING, viewportWidth - MENU_WIDTH - EDGE_PADDING)`

### 9.3 上翻触发条件

同时满足：

1. 下方可用空间 `< FLIP_THRESHOLD`
2. 上方空间 `>= menuHeight + FLIP_SAFE_GAP`

上翻计算：

- `top = anchor.bottom - menuHeight - FLIP_SAFE_GAP`

约束：

1. 菜单底边不得进入输入行安全区（避免遮挡输入行）。
2. 无法满足上翻条件时保持下翻并启用容器内滚。

### 9.4 小视口保护

当 `viewportHeight < LOW_VIEWPORT_THRESHOLD`：

1. `max-height: 85vh`
2. `overflow-y: auto`

### 9.5 两阶段高度策略

1. 首帧按估算高度布局。
2. `layoutEffect` 读取真实高度后只在“高度变化”时重算。
3. 禁止无差异回写，防止更新循环。

---

## 10. 键盘导航与滚动联动（重构版硬规范）

### 10.1 导航键

- `ArrowDown`: 下一项（循环）
- `ArrowUp`: 上一项（循环）
- `Tab`: 等价 `ArrowDown`
- `Enter`: 执行当前项
- `Esc`: 关闭 Slash

### 10.2 提前滚动算法

- `SCROLL_BUFFER = 20`（较当前实现略增）
- `visibleTop = scrollTop + SCROLL_BUFFER`
- `visibleBottom = scrollTop + clientHeight - SCROLL_BUFFER`

规则：

1. `itemTop < visibleTop` -> `scrollTop = itemTop - SCROLL_BUFFER`
2. `itemBottom > visibleBottom` -> `scrollTop = itemBottom - clientHeight + SCROLL_BUFFER`

要求：

1. 选中项始终落在“可视安全带”内。
2. 不允许“超出 1~2 项后才开始滚”的迟滞体验。

---

## 11. 关闭协议与 Esc 优先级

### 11.1 Slash 层关闭触发

1. Esc
2. 点击菜单外
3. 执行命令后
4. 编辑器失焦

### 11.2 多浮层 Esc 优先级

统一顺序：

1. 当前活跃编辑器浮层（Slash / Find / Outline / ContextMenu）
2. Focus Zen 退出
3. 更外层容器

禁止：

1. 一次 Esc 同时关闭 Slash 并退出 Focus Zen。

---

## 12. 视觉与交互基线

沿用当前视觉参数（与尺寸清单一致）：

1. 菜单宽 `260px`
2. 项高 `34px`
3. 菜单圆角 `12px`
4. `z-index`: Slash Menu 50，Slash Inline 24，Ghost Hint 25
5. 分组标题、hover/active 样式保持现行语言

---

## 13. 与其他模块的协作约束

1. Ghost Hint 只在 `slashPhase=idle` 且严格触发条件成立时显示。
2. Slash Inline 仅作为会话可视反馈，不参与输入。
3. Focus Zen 下 Slash 行为不降级（仅受 Esc 优先级约束）。
4. Typewriter 锚点逻辑不得修改 Slash 定位坐标来源。

---

## 14. 实施顺序（建议）

1. 第一步：抽离纯函数层（`slashLayout.ts`、`slashScroll.ts`、`slashSessionMachine.ts`）。
2. 第二步：重写 `useSlashMenu`，改为状态机驱动。
3. 第三步：重写 `SlashMenu` 视图组件（仅渲染 + refs）。
4. 第四步：接入 Editor 容器 Esc 仲裁与外部点击关闭。
5. 第五步：补齐单测与回归用例。

---

## 15. 测试与验收（必须通过）

### 15.1 单元测试

1. 布局函数：上翻、右侧夹取、低视口内滚、输入行安全区。
2. 滚动函数：上下导航提前滚动、循环选择边界。
3. 状态机：触发、删除、关闭、执行、空结果行为。

### 15.2 集成测试

1. IME：全角 `/` + 中文组合输入。
2. Esc：Slash 与 Find/Focus Zen 优先级。
3. 点击外部关闭与失焦关闭。

### 15.3 手测映射

本轮至少通过：

1. `TC-E01`
2. `TC-E02`
3. `TC-E03`
4. `TC-E04`
5. `TC-E05`
6. `TC-E06`
7. `TC-E09`

---

## 16. 风险与防回归策略

1. 风险：状态机接管后行为变化较大。
- 对策：先保留现有命令集与 UI 样式，减少变量。

2. 风险：IME 与 beforeinput 差异浏览器行为。
- 对策：增加组合输入路径专项测试。

3. 风险：高度测量导致循环更新。
- 对策：只在高度变化时更新，且禁止布局对象无差异 setState。

---

## 17. 交付物清单

1. 重构规格文档（本文件）。
2. 纯函数层代码与单测。
3. 新版 `useSlashMenu` 与 `SlashMenuView`。
4. 回归报告（覆盖模块 E 全量 P0）。

---

## 18. 结论

Slash Menu 本轮按“**完整替换实现**”执行，不再沿用补丁式修复路径。后续所有开发与验收以本规格为唯一基线。

---

## 19. 代码交叉审阅清单（防遗漏）

以下条目已按当前代码核对，重构时需显式保留或按本规格替换：

1. 触发字符双支持：`/` 与 `／`（见 `SlashMenu.tsx`）。
2. 严格触发资格：顶级空段落 + 折叠光标 + 非代码块（见 `slashEligibility.ts`）。
3. 命令集与分组：`basic/advanced`，并限制最大 14 项。
4. 中文匹配能力：`zh-CN` 下拼音匹配（`pinyin-pro`）。
5. IME 事件通道：`beforeinput + compositionstart/end` 协同。
6. 菜单定位：右边界夹取、上翻阈值、低视口 `85vh` 内滚。
7. 菜单尺寸样式：`width=260`、`item min-height=34`、`radius=12`（见 `Editor.css`）。
8. 键盘导航：`ArrowUp/Down` 循环、`Tab` 同下移、`Enter` 执行、`Esc` 关闭。
9. 菜单内活动项可见性：选中项切换时自动滚动到可视区。
10. 外部点击关闭：点击 `.editor-slash-menu` 外部关闭会话。
11. Ghost Hint 联动：仅 `slashPhase=idle` 且满足严格触发时显示（见 `useGhostHint.ts`）。
12. Focus Zen Esc 仲裁：有活跃编辑器浮层时，不直接退出 Focus Zen（见 `Editor.tsx`）。
