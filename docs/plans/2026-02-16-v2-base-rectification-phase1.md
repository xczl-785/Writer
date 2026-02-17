# V2 底座整改 Phase 1 (规范与类型治理) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 消除所有 Lint 错误，统一代码风格，减少 `any` 滥用，确保 `npm run lint` 零报错。

**Architecture:** 采用线性修复策略，先执行自动修复，再手动处理类型错误，每步验证测试。

**Tech Stack:** ESLint, Prettier, TypeScript, Vitest

---

### Task 1: 自动修复 Lint 与格式问题

**Files:**

- Modify: `src/**/*.ts*` (批量自动修复)

**Step 1: 执行自动修复命令**

Run: `npm run lint -- --fix`
Expected: 部分 Prettier 格式错误和简单的 Lint 错误被自动修复。

**Step 2: 验证剩余错误**

Run: `npm run lint`
Expected: 错误数量减少，剩余主要为 `any` 类型错误。

**Step 3: 运行测试确保无破坏**

Run: `npm run test`
Expected: PASS (66/66)

**Step 4: Commit**

```bash
git add .
git commit -m "chore: auto-fix lint and formatting issues"
```

### Task 2: 修复 AutosaveService.test.ts 中的 any 类型

**Files:**

- Modify: `src/services/autosave/AutosaveService.test.ts`

**Step 1: 识别 any 使用点**

定位第 27 行和 106 行的 `any`。

**Step 2: 替换为具体类型或 Mock 类型**

```typescript
// 示例修改 (具体需根据上下文定义)
// old: const mockWorkspace: any = { ... }
// new: const mockWorkspace = { ... } as unknown as WorkspaceManager
```

**Step 3: 验证 Lint**

Run: `npx eslint src/services/autosave/AutosaveService.test.ts`
Expected: 该文件无 Lint 错误。

**Step 4: 运行测试**

Run: `npm run test src/services/autosave/AutosaveService.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/autosave/AutosaveService.test.ts
git commit -m "refactor: remove any usage in AutosaveService.test.ts"
```

### Task 3: 修复 useImagePaste.test.ts 中的 any 类型

**Files:**

- Modify: `src/ui/editor/useImagePaste.test.ts`

**Step 1: 识别 any 使用点**

定位文件中多处 `any` 使用（共约 12 处）。

**Step 2: 批量替换为具体类型**

为 Mock 对象定义接口或使用 `Partial<T>`。

**Step 3: 验证 Lint**

Run: `npx eslint src/ui/editor/useImagePaste.test.ts`
Expected: 该文件无 Lint 错误。

**Step 4: 运行测试**

Run: `npm run test src/ui/editor/useImagePaste.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/ui/editor/useImagePaste.test.ts
git commit -m "refactor: remove any usage in useImagePaste.test.ts"
```

### Task 4: 最终 Gate 校验

**Files:**

- N/A

**Step 1: 全局 Lint 检查**

Run: `npm run lint`
Expected: 0 errors, 0 warnings (or only acceptable warnings)

**Step 2: 全局测试检查**

Run: `npm run test`
Expected: PASS (66/66)

**Step 3: 更新执行记录**

Modify: `docs/current/V2底座整改执行计划_V2.md`
将 Phase 1 状态更新为 COMPLETED。

**Step 4: Commit**

```bash
git add docs/current/V2底座整改执行计划_V2.md
git commit -m "docs: update Phase 1 status to completed"
```
