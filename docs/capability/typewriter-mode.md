# typewriter-mode

## Quick Read

- **id**: `typewriter-mode`
- **name**: 打字机模式
- **summary**: 通过事件驱动状态机实现 Free/Locked 双态体验，锁定光标垂直位置避免视觉跳跃
- **scope**: 包括状态机、事件处理、守卫规则、锚点计算；不包括滚动执行、UI 渲染
- **entry_points**:
  - reduceTypewriterState 状态归约
  - dispatchTypewriterEvent 事件分发
  - useTypewriterAnchor hook
- **shared_with**: none
- **check_on_change**:
  - 状态机转换正确
  - 事件类型完整
  - 守卫规则正确
- **last_verified**: 2026-03-20

---

## Capability Summary

打字机模式采用事件驱动状态机实现 Free/Locked 双态体验。Free 模式下光标自然移动，Locked 模式下光标垂直位置锁定，视图反向补偿。通过阈值检测（默认 45%）触发 Free→Locked 转换，外部事件（鼠标点击、大纲导航、查找替换）触发 Locked→Free 回退。支持 IME 组合输入、短内容保护等边界策略。

---

## Entries

| Entry                                                   | Trigger          | Evidence                                                               | Notes       |
| ------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------- | ----------- |
| reduceTypewriterState                                   | 事件触发状态转换 | `src/domains/editor/domain/typewriter/reducers.ts:21-93`               | 纯函数      |
| dispatchTypewriterEvent                                 | 事件分发入口     | `src/domains/editor/domain/typewriter/reducers.ts:95-98`               | 调用 reduce |
| createInitialTypewriterState                            | 创建初始状态     | `src/domains/editor/domain/typewriter/typewriterStateMachine.ts:12-16` | Free 模式   |
| createLockedTypewriterState                             | 创建锁定状态     | `src/domains/editor/domain/typewriter/typewriterStateMachine.ts:18-25` | Locked 模式 |
| reduceTypewriterInputMovement                           | 处理输入移动     | `src/domains/editor/domain/typewriter/typewriterStateMachine.ts:27-56` | 阈值检测    |
| computeLockedTypewriterTargetScrollTop                  | 计算滚动目标     | `src/domains/editor/domain/typewriter/typewriterStateMachine.ts:58-69` | 补偿计算    |
| shouldActivateTypewriterAnchor                          | 激活条件判定     | `src/domains/editor/domain/typewriter/typewriterDomain.ts:4-12`        | 阈值判定    |
| computeTypewriterTargetScrollTop                        | 计算滚动目标     | `src/domains/editor/domain/typewriter/typewriterDomain.ts:14-35`       | 主计算函数  |
| isWithinAnchorDeadband                                  | 死区判定         | `src/domains/editor/domain/typewriter/typewriterDomain.ts:37-41`       | 守卫规则    |
| hasCrossedOrTouchedThreshold                            | 阈值判定         | `src/domains/editor/domain/typewriter/guards.ts:4-14`                  | 守卫规则    |
| isInputChainEventType                                   | 输入链事件判定   | `src/domains/editor/domain/typewriter/guards.ts:16-23`                 | 守卫规则    |
| shouldDowngradeLockedStateForExternalUpwardCompensation | 外部向上补偿判定 | `src/domains/editor/domain/typewriter/guards.ts:39-51`                 | 守卫规则    |

---

## Current Rules

### CR-001: 双态模式 Free/Locked

TypewriterMode 包括 `free`（光标自然移动）和 `locked`（光标位置锁定，视图补偿）。

**Evidence**: `src/domains/editor/domain/typewriter/typewriterStateMachine.ts:4`

---

### CR-002: 状态包含三个字段

TypewriterState 包括 `mode`、`dynamicAnchorY`（锚点坐标）、`lastTrigger`（最后触发源）。

**Evidence**: `src/domains/editor/domain/typewriter/typewriterStateMachine.ts:6-10`

---

### CR-003: 默认锚点比例 0.45，死区 12px

`DEFAULT_TYPEWRITER_ANCHOR_RATIO` 默认 0.45（视口高度 45% 处），`DEFAULT_TYPEWRITER_ANCHOR_DEADBAND_PX` 默认 12px。

**Evidence**: `src/domains/editor/domain/typewriter/typewriterDomain.ts:1-2`

---

### CR-004: 五种触发源

TriggerSource 包括 `input`、`ime`、`arrow`、`mouse`、`external`。

**Evidence**: `src/domains/editor/domain/typewriter/events.ts:1`

---

### CR-005: 十二种事件类型

TypewriterEventEnvelope.type 包括 before-input、enter-keydown、arrow-keydown、composition-start、composition-end、mouse-caret-placed、find-jump、outline-jump、programmatic-selection、viewport-measured、selection-changed、force-free（共 12 种）。

**Evidence**: `src/domains/editor/domain/typewriter/events.ts:3-15`

---

### CR-006: force-free 事件类型强制回退

force-free、mouse-caret-placed、find-jump、outline-jump、programmatic-selection 事件强制回到 Free 模式。

**Evidence**: `src/domains/editor/domain/typewriter/reducers.ts:14-19, 25-30`

---

### CR-007: 阈值检测基于穿越/触碰

hasCrossedOrTouchedThreshold 判断 previousCaretTop 和 nextCaretTop 是否穿越或触碰 thresholdY。

**Evidence**: `src/domains/editor/domain/typewriter/guards.ts:4-14`

---

### CR-008: 外部向上补偿降级

当外部事件触发且光标位置低于锚点时，降级为 Free 模式。

**Evidence**: `src/domains/editor/domain/typewriter/guards.ts:39-51`

---

### CR-009: 补偿计算公式

computeLockedTypewriterTargetScrollTop 计算 `currentScrollTop + (caretTop - dynamicAnchorY)`。

**Evidence**: `src/domains/editor/domain/typewriter/typewriterStateMachine.ts:58-69`

---

## Impact Surface

| Area                | What to check                  | Evidence                                                                                                  |
| ------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------- |
| 状态机              | reduceTypewriterState 转换正确 | `src/domains/editor/domain/typewriter/reducers.ts`                                                        |
| 事件类型            | 所有事件类型正确处理           | `src/domains/editor/domain/typewriter/events.ts`                                                          |
| 守卫规则            | 所有守卫函数正确               | `src/domains/editor/domain/typewriter/guards.ts`                                                          |
| TypewriterState     | 状态结构不变                   | `src/domains/editor/domain/typewriter/typewriterStateMachine.ts`                                          |
| useTypewriterAnchor | Hook 集成正确                  | `src/domains/editor/hooks/useTypewriterAnchor.ts`                                                         |
| 滚动协调器联动      | 滚动请求正确                   | `src/domains/editor/domain/scroll/`                                                                       |
| 测试覆盖            | 相关测试通过                   | `src/domains/editor/domain/typewriter/*.test.ts`、`src/domains/editor/hooks/useTypewriterAnchor*.test.ts` |

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

| Consumer            | Usage                         | Evidence                                           |
| ------------------- | ----------------------------- | -------------------------------------------------- |
| useTypewriterAnchor | Hook 集成，状态管理和滚动计算 | `src/domains/editor/hooks/useTypewriterAnchor.ts`  |
| EditorImpl          | 传递 isTypewriterActive prop  | `src/domains/editor/core/EditorImpl.tsx`           |
| useOutlineExtractor | 大纲导航时 emit force-free    | `src/ui/components/Outline/useOutlineExtractor.ts` |
| useFindReplace      | 查找导航时 emit force-free    | `src/domains/editor/hooks/useFindReplace.ts`       |

---

## Archive Pointer

- None. This is a first-version capability document.
