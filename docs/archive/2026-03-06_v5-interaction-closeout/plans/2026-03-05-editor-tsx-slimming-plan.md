# Editor.tsx 持续重构计划（非功能性）

> 基于已完成的 `core/domain/integration/view` 分层，继续收敛 `Editor.tsx` 为薄编排层。

## 1. 目标

1. `Editor.tsx` 仅保留 props 适配与向后兼容导出。
2. 主要编排逻辑下沉到 `core/EditorOrchestrator.tsx`。
3. 不改变现有用户可见行为。
4. 每一步保持可编译、可测试、可回退。

## 2. 当前状态（基线）

1. `EditorView` 已接入渲染边界。
2. `domain` 与 `integration` 已完成首轮下沉。
3. `Editor.tsx` 仍承载较多状态协调、副作用订阅与 JSX 组装。

## 3. 下一阶段拆分策略

### Phase 1: 提炼 Orchestrator 输入输出接口

1. 在 `core/EditorOrchestrator.tsx` 定义标准 props 与返回视图契约。
2. 将 `Editor.tsx` 中与外部组件耦合较弱的组装逻辑先迁入 orchestrator。
3. `Editor.tsx` 保留兼容包装：`forwardRef + <EditorOrchestrator ... />`。

**验收**
1. `Editor.tsx` 行数显著下降。
2. `pnpm build` / `pnpm test` 通过。

### Phase 2: 副作用迁移（菜单、右键、焦点、outline）

1. 把 effect 型逻辑按职责迁入 orchestrator 内部 hook（仅搬迁，不改语义）。
2. 维持现有 `integration` 桥调用路径不变。
3. 对应更新组合契约测试，避免回归。

**验收**
1. `Editor.tsx` 中 `useEffect` 数量接近 0。
2. 相关行为测试仍通过。

### Phase 3: 状态读取收敛到 StateFacade

1. `EditorOrchestrator` 通过 `useEditorStateFacade` 读取状态。
2. 清理 `Editor.tsx` 里直接访问多个 store 的路径。
3. 将零散回调聚合为 orchestrator 内命令对象。

**验收**
1. 状态访问入口集中在 facade。
2. 类型检查与回归测试全绿。

### Phase 4: 删除过渡兼容痕迹

1. 删除不再被引用的临时桥接与遗留 marker（仅确认无引用后执行）。
2. 更新收口文档与台账。

**验收**
1. 无死代码、无未引用导出。
2. 全量 `pnpm build && pnpm test` 通过。

## 4. 风险与控制

1. 风险：源码字符串测试仍会约束迁移路径。  
控制：优先保留关键 marker，逐步迁移为行为契约测试后再清理。

2. 风险：大文件迁移导致冲突与回归。  
控制：每次只迁一种职责（渲染/副作用/状态）并立即验证。

## 5. 执行顺序建议

1. 先 Phase 1 + Phase 2（保持结构迁移为主）。
2. 再 Phase 3（状态收敛）。
3. 最后 Phase 4（清理收口）。

