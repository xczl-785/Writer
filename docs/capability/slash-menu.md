# slash-menu

## Quick Read

- **id**: `slash-menu`
- **name**: 斜杠菜单
- **summary**: 通过 `/` 触发的命令面板，用于快速插入块级 Markdown 元素
- **scope**: 包括触发判定、状态机、布局算法、命令执行；不包括行内格式化命令
- **entry_points**:
  - 输入 `/` 或 `／` 触发
  - useSlashMenu hook
  - slashReducer 状态机
- **shared_with**: none
- **check_on_change**:
  - 触发条件不变
  - 状态机转换正确
  - 布局算法正确
- **last_verified**: 2026-03-20

---

## Capability Summary

斜杠菜单是通过 `/` 触发的命令面板，用于快速插入块级 Markdown 元素。采用纯函数状态机管理会话状态（idle/open/searching/executing），布局算法处理菜单位置（右边界钳制、上下翻转、内部滚动）。支持键盘导航（ArrowUp/Down/Enter/Esc）、鼠标交互、搜索过滤。中文环境支持拼音搜索。

---

## Entries

| Entry                    | Trigger      | Evidence                                                         | Notes        |
| ------------------------ | ------------ | ---------------------------------------------------------------- | ------------ |
| 输入 `/` 或 `／`         | 触发斜杠菜单 | `src/domains/editor/domain/slash/slashDomain.ts:1-3`             | 触发字符判定 |
| slashReducer             | 状态转换     | `src/domains/editor/domain/slash/slashSessionMachine.ts:42-116`  | 纯函数       |
| computeSlashMenuLayout   | 计算菜单位置 | `src/domains/editor/domain/slash/slashLayout.ts:62-120`          | 布局算法     |
| computeKeyboardScrollTop | 键盘导航滚动 | `src/domains/editor/domain/slash/slashScroll.ts:24-54`           | 滚动算法     |
| isOpenPhase              | 判断打开阶段 | `src/domains/editor/domain/slash/slashSessionMachine.ts:118-120` | 工具函数     |
| isActivePhase            | 判断活跃阶段 | `src/domains/editor/domain/slash/slashSessionMachine.ts:122-124` | 工具函数     |
| useSlashMenu             | Hook 入口    | `src/domains/editor/ui/menus/useSlashMenu.ts`                    | 状态机驱动   |
| SlashMenuView            | 渲染组件     | `src/domains/editor/ui/menus/SlashMenuView.tsx`                  | 纯渲染       |
| slashEligibility         | 触发资格判定 | `src/domains/editor/ui/menus/slashEligibility.ts`                | 边界检查     |

---

## Current Rules

### CR-001: 触发字符包括半角和全角斜杠

`isSlashTriggerChar` 判断字符是否为 `/` 或 `／`。

**Evidence**: `src/domains/editor/domain/slash/slashDomain.ts:1-3`

---

### CR-002: 状态机四阶段

SlashPhase 包括 `idle`、`open`、`searching`、`executing`。

**Evidence**: `src/domains/editor/domain/slash/slashSessionMachine.ts:8, 42`

---

### CR-003: OPEN 动作设置锚点和来源

OPEN 动作需要 anchorRect 和 source（keyboard/ime）。

**Evidence**: `src/domains/editor/domain/slash/slashSessionMachine.ts:25, 47-54`

---

### CR-004: APPEND_QUERY 进入 searching 阶段

APPEND_QUERY 将字符追加到 query，并将阶段设为 searching。

**Evidence**: `src/domains/editor/domain/slash/slashSessionMachine.ts:56-63`

---

### CR-005: DELETE_QUERY 清空时回到 idle

DELETE_QUERY 删除最后一个字符，若 query 为空则回到 idle。

**Evidence**: `src/domains/editor/domain/slash/slashSessionMachine.ts:65-76`

---

### CR-006: MOVE_NEXT/MOVE_PREV 循环导航

MOVE_NEXT 和 MOVE_PREV 支持循环导航。

**Evidence**: `src/domains/editor/domain/slash/slashSessionMachine.ts:88-101`

---

### CR-007: 布局算法处理右边界和上下翻转

computeSlashMenuLayout 处理右边界钳制、空间不足时上下翻转、内部滚动。

**Evidence**: `src/domains/editor/domain/slash/slashLayout.ts:62-120`

---

### CR-008: 触发边界严格模式

触发斜杠菜单需要满足：编辑器聚焦、光标折叠、顶级段落、段落类型、段落为空、非代码块内。

**Evidence**: `src/domains/editor/ui/menus/slashEligibility.ts`（参考 `Slash菜单设计.md` 2.1节）

---

## Impact Surface

| Area             | What to check        | Evidence                                                 |
| ---------------- | -------------------- | -------------------------------------------------------- |
| 触发字符判定     | `/` 和 `／` 正确触发 | `src/domains/editor/domain/slash/slashDomain.ts`         |
| 状态机           | 所有状态转换正确     | `src/domains/editor/domain/slash/slashSessionMachine.ts` |
| 布局算法         | 位置计算正确         | `src/domains/editor/domain/slash/slashLayout.ts`         |
| useSlashMenu     | Hook 状态管理正确    | `src/domains/editor/ui/menus/useSlashMenu.ts`            |
| SlashMenuView    | UI 渲染正确          | `src/domains/editor/ui/menus/SlashMenuView.tsx`          |
| slashEligibility | 触发边界正确         | `src/domains/editor/ui/menus/slashEligibility.ts`        |
| 拼音搜索         | 中文环境拼音匹配正确 | `src/domains/editor/ui/menus/SlashMenuView.tsx`          |
| 测试覆盖         | 相关测试通过         | `src/domains/editor/domain/slash/slashLayout.test.ts`    |

---

## Shared Rules Dependency

| Shared Rule | Dependency                 | Lifted |
| ----------- | -------------------------- | ------ |
| none        | No shared rules identified | no     |

---

## Uncertainties

- None currently identified.

---

## Known Consumers

| Consumer        | Usage                 | Evidence                                        |
| --------------- | --------------------- | ----------------------------------------------- |
| useSlashMenu    | Hook 入口，状态机驱动 | `src/domains/editor/ui/menus/useSlashMenu.ts`   |
| SlashMenuView   | 渲染组件              | `src/domains/editor/ui/menus/SlashMenuView.tsx` |
| SlashInlineView | 内联指示器            | `src/domains/editor/ui/menus/SlashMenuView.tsx` |
| EditorImpl      | 集成斜杠菜单          | `src/domains/editor/core/EditorImpl.tsx`        |

---

## Archive Pointer

- None. This is a first-version capability document.
