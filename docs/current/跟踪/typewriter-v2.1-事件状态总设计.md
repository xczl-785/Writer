# Typewriter 事件-状态总设计（V2.1）

> 状态：已落地（实现基线）  
> 分支：`codex/typewriter-v2`  
> 更新日期：2026-03-08

## 1. 目标

将打字机逻辑从“Hook 内条件分支”收敛为“事件驱动状态机”，统一 `Free/Locked` 判定、回退矩阵与补偿执行边界，保证后续迭代基于状态机演进。

## 2. 状态模型

- `TypewriterState = { mode, dynamicAnchorY, lastTrigger }`
- `mode`: `free | locked`
- `dynamicAnchorY`: 仅在 `locked` 状态有效，锁定后不漂移
- `lastTrigger`: 最近一次触发来源（`input | ime | arrow | mouse | external`）

## 3. 事件模型

- 输入链：`before-input` / `enter-keydown` / `arrow-keydown` / `composition-start` / `composition-end`
- 定位链：`mouse-caret-placed` / `find-jump` / `outline-jump` / `programmatic-selection`
- 环境链：`viewport-measured` / `selection-changed` / `force-free`
- 统一封装：`TypewriterEventEnvelope = { type, timestamp, source, payload }`

## 4. 状态转移规则

- `Free -> Locked`：输入链事件发生阈值双向跨越（触碰或越过 45%）
- `Locked -> Locked`：仅输入链继续补偿，目标滚动为 `current + (caretTop - dynamicAnchorY)`
- `Locked -> Free`：鼠标有效落点、Find/Outline/程序化跳转、外部强制释放、外部上拉极限路径
- `Free -> Free`：未跨阈值或短内容保护生效时保持自由态

## 5. 实现映射

- 事件定义：`src/ui/editor/domain/typewriter/events.ts`
- 守卫规则：`src/ui/editor/domain/typewriter/guards.ts`
- 状态归约：`src/ui/editor/domain/typewriter/reducers.ts`
- 基础状态机：`src/ui/editor/domain/typewriter/typewriterStateMachine.ts`
- Hook 接入：`src/ui/editor/hooks/useTypewriterAnchor.ts`

## 6. 不变量

- 锁定态锚点固定，不在补偿中漂移更新
- 非输入跳转不做回拉补偿
- 非落点点击不改变状态
- IME 组合期间不补偿，`composition-end` 做闭环更新
- 视口不可激活（短内容）时降级为 `free`

## 7. 回归基线

- `src/ui/editor/domain/typewriter/reducers.test.ts`
- `src/ui/editor/domain/typewriter/typewriterStateMachine.test.ts`
- `src/ui/editor/hooks/useTypewriterAnchor.test.ts`
- `src/ui/editor/hooks/useTypewriterAnchorBehavior.test.ts`
- `src/ui/editor/hooks/useTypewriterAnchorPhase3.test.ts`
- `src/ui/editor/TypewriterFallbackIntegration.test.ts`

