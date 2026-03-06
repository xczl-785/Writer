# Editor 文本区重构收口记录（进行中）

## 1. 目标

在不引入功能性变更的前提下，完成编辑区架构重构，建立 `core/domain/integration/view` 分层，并保持阶段可编译、可兼容、小步推进。

## 2. 已完成阶段

1. 阶段 A（骨架搭建）
- 新增 `src/ui/editor/core/*`、`src/ui/editor/view/*`、`src/ui/editor/domain/*`、`src/ui/editor/integration/*` 基础结构。

2. 阶段 B（布局系统统一）
- 统一 `EditorLayoutModel`，通过 CSS 变量将正文宽度/上下内边距与 Typewriter 锚点参数对齐到单一来源。

3. 阶段 C（Integration 抽离）
- 抽离 `menu/context/paste/persistence` bridge，`Editor.tsx` 由直接编排副作用改为调用 integration 层。

4. 阶段 D（Domain 抽离）
- 抽离 `findReplace/slash/focusZen/typewriter` 纯逻辑，hook 与菜单组件改为生命周期绑定层。

5. 阶段 E（Orchestrator/View 收口）
- 引入 `EditorView` 渲染边界，建立 `EditorOrchestrator` 组合入口并补充组合契约测试。
- 将 `Editor.tsx` 收敛为兼容入口；主实现迁移至 `EditorImpl.tsx`，由 `EditorOrchestrator` 承接编排。

6. 阶段 F（测试体系迁移）
- 将 `EditorFindReplace.test.ts`、`EditorTableControls.test.ts`、`EditorStartup.test.ts` 从源码字符串断言迁移为可执行契约测试。
- 新增 `src/ui/editor/contracts/editorContracts.test.ts`。

7. 阶段 G（清理）
- 删除无引用兼容文件：`src/ui/editor/editorExtensions.ts`。

## 3. 验证结果

最新验证命令与结果：

1. `pnpm build`：通过
2. `pnpm test -- src/ui/editor src/ui/layout src/app`：通过

## 4. 模块归属（当前）

1. `core/`：布局模型、状态门面、编排入口
2. `domain/`：纯逻辑（无 UI 副作用）
3. `integration/`：外部桥接（菜单、右键、粘贴、持久化）
4. `view/`：渲染边界
5. `Editor.tsx`：向后兼容入口（保留最小导出与兼容 marker）
6. `EditorImpl.tsx`：当前编辑器主实现（待后续继续下沉到 orchestrator）

## 5. 后续维护约束

1. 新增编辑器业务规则优先落在 `domain` 或 `integration`，避免回流 `Editor.tsx`。
2. 优先新增契约测试，不新增源码字符串断言测试。
3. `EditorLayoutModel` 作为布局参数单一真相，禁止在多个文件硬编码重复常量。
