# Editor Text Area Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在不引入功能性变更的前提下，完成编辑区架构重构，建立可维护、可测试、可扩展的分层体系，并确保每阶段可编译、可兼容。

**Architecture:** 采用“终态先行 + 阶段迁移”策略，先建立核心边界（layout/domain/integration/view/core），再按桥接与逻辑逐层迁移。迁移过程中通过 facade 与 adapter 保持行为兼容，最终将 `Editor.tsx` 收敛为编排器。

**Tech Stack:** React 19, TypeScript, Zustand, TipTap, Vitest, Tauri 2

---

## Global Rules

1. 只做非功能性重构；禁止新增产品能力。
2. 每个 Task 完成后必须通过：
- `pnpm typecheck`
- `pnpm test -- src/ui/editor src/ui/layout src/app`
3. 每个 Task 完成后单独提交（Conventional Commits）。
4. 发现行为偏差时立即停在当前阶段修复，不跨阶段累积风险。

---

### Task 1: 建立终态骨架与兼容导出

**Files:**
- Create: `src/ui/editor/core/EditorOrchestrator.tsx`
- Create: `src/ui/editor/core/EditorLayoutModel.ts`
- Create: `src/ui/editor/core/EditorStateFacade.ts`
- Create: `src/ui/editor/view/EditorView.tsx`
- Create: `src/ui/editor/integration/index.ts`
- Create: `src/ui/editor/domain/index.ts`
- Modify: `src/ui/editor/Editor.tsx`

**Step 1: Write failing compile-level tests/types for new exports**
- Add minimal tests ensuring new modules compile and export expected symbols.

**Step 2: Run test to verify fail**
- Run: `pnpm test -- src/ui/editor`
- Expected: fail due to missing files/symbols.

**Step 3: Add skeleton modules with passthrough behavior**
- Keep runtime behavior identical by delegating back to existing logic.

**Step 4: Run tests & typecheck**
- Run: `pnpm typecheck && pnpm test -- src/ui/editor`
- Expected: pass.

**Step 5: Commit**
- `refactor(editor): add target architecture skeleton with compatibility exports`

---

### Task 2: 统一布局系统（单一来源，不改参数）

**Files:**
- Create: `src/ui/editor/core/EditorLayoutModel.test.ts`
- Modify: `src/ui/editor/core/EditorLayoutModel.ts`
- Modify: `src/ui/editor/Editor.css`
- Modify: `src/ui/editor/hooks/useTypewriterAnchor.ts`
- Modify: `src/ui/editor/components/EditorShell.tsx`

**Step 1: Write failing tests for layout contract**
- Cover: tier -> top/bottom/inline/maxWidth/anchorRatio mapping.

**Step 2: Verify fail**
- Run: `pnpm test -- src/ui/editor/core/EditorLayoutModel.test.ts`

**Step 3: Implement layout model and wire consumers**
- CSS variables + hook input all from layout model.
- Keep existing numeric values unchanged.

**Step 4: Verify pass**
- Run: `pnpm typecheck && pnpm test -- src/ui/editor src/ui/layout`

**Step 5: Commit**
- `refactor(editor): centralize layout metrics into EditorLayoutModel`

---

### Task 3: Integration 层迁移（menu/context/paste/autosave）

**Files:**
- Create: `src/ui/editor/integration/menuBridge.ts`
- Create: `src/ui/editor/integration/contextBridge.ts`
- Create: `src/ui/editor/integration/pasteBridge.ts`
- Create: `src/ui/editor/integration/persistenceBridge.ts`
- Create: `src/ui/editor/integration/*.test.ts`
- Modify: `src/ui/editor/Editor.tsx`
- Modify: `src/ui/editor/handlers/*.ts`
- Modify: `src/ui/editor/useImagePaste.ts`

**Step 1: Write failing bridge contract tests**
- Command mapping, context action routing, paste pipeline call order, autosave scheduling contract.

**Step 2: Verify fail**
- Run: `pnpm test -- src/ui/editor/integration`

**Step 3: Extract bridge modules and keep API stable**
- `Editor.tsx` only binds callbacks from integration modules.

**Step 4: Verify pass**
- Run: `pnpm typecheck && pnpm test -- src/ui/editor`

**Step 5: Commit**
- `refactor(editor): extract integration bridges for menu context paste and persistence`

---

### Task 4: Domain 层迁移（find/replace + slash + focus gate + typewriter calc）

**Files:**
- Create: `src/ui/editor/domain/findReplace/*`
- Create: `src/ui/editor/domain/slash/*`
- Create: `src/ui/editor/domain/focusZen/*`
- Create: `src/ui/editor/domain/typewriter/*`
- Create: `src/ui/editor/domain/**/*.test.ts`
- Modify: `src/ui/editor/useFindReplace.ts`
- Modify: `src/ui/editor/menus/SlashMenu.tsx`
- Modify: `src/ui/editor/hooks/useGhostHint.ts`
- Modify: `src/ui/editor/hooks/useTypewriterAnchor.ts`

**Step 1: Add failing domain behavior tests**
- Match collection, selection indexing, slash trigger eligibility, focus-zen escape gating, anchor target calc.

**Step 2: Verify fail**
- Run: `pnpm test -- src/ui/editor/domain`

**Step 3: Move pure logic into domain modules**
- Hooks keep lifecycle binding only.

**Step 4: Verify pass**
- Run: `pnpm typecheck && pnpm test -- src/ui/editor`

**Step 5: Commit**
- `refactor(editor): move editor interaction logic into domain modules`

---

### Task 5: Orchestrator/View 收口

**Files:**
- Modify: `src/ui/editor/core/EditorOrchestrator.tsx`
- Modify: `src/ui/editor/view/EditorView.tsx`
- Modify: `src/ui/editor/Editor.tsx`
- Modify: `src/ui/editor/components/EditorShell.tsx`

**Step 1: Add failing integration test for orchestrator composition**
- Assert mounting path, overlay props wiring, editor content render contract.

**Step 2: Verify fail**
- Run: `pnpm test -- src/ui/editor`

**Step 3: Move composition to orchestrator and slim Editor.tsx**
- `Editor.tsx` becomes backward-compatible wrapper export.

**Step 4: Verify pass**
- Run: `pnpm typecheck && pnpm test -- src/ui/editor src/app`

**Step 5: Commit**
- `refactor(editor): introduce orchestrator and pure view composition`

---

### Task 6: 测试体系迁移（字符串断言 -> 契约断言）

**Files:**
- Create: `src/ui/editor/contracts/*.contract.test.ts`
- Modify: `src/ui/editor/EditorFindReplace.test.ts`
- Modify: `src/ui/editor/EditorTableControls.test.ts`
- Modify: `src/ui/editor/EditorStartup.test.ts`

**Step 1: Add failing contract tests first**
- Cover real behavior contracts (keyboard action -> editor state changes, not source text).

**Step 2: Verify fail**
- Run: `pnpm test -- src/ui/editor/contracts`

**Step 3: Replace/trim fragile string-based tests**
- Keep minimum source-marker tests only if strictly required.

**Step 4: Verify pass**
- Run: `pnpm typecheck && pnpm test -- src/ui/editor`

**Step 5: Commit**
- `test(editor): replace fragile source-string assertions with contract tests`

---

### Task 7: 清理兼容层与文档收口

**Files:**
- Modify: `src/ui/editor/**` (remove dead adapters)
- Create: `docs/current/跟踪/editor-refactor-closeout.md`
- Modify: `docs/current/跟踪/全流程需求跟踪台账.md`

**Step 1: identify dead paths and mark candidates**
- Use `rg` + import graph checks.

**Step 2: remove only unreferenced compatibility paths**
- No behavior change.

**Step 3: final verify**
- Run: `pnpm typecheck && pnpm test`

**Step 4: document closeout**
- Add migration map and module ownership table.

**Step 5: Commit**
- `chore(editor): remove obsolete compatibility paths and document refactor closeout`

---

## Parallelization Matrix (Multi-Agent)

### 可并行（推荐）

1. Task 2（布局系统）可与 Task 3（integration 抽离）并行，前提是两组不同时改 `Editor.tsx` 主体段落；通过临时接线分支合并。
2. Task 4（domain 抽离）可拆 2-3 个 agent：
- Agent A: findReplace domain
- Agent B: slash domain
- Agent C: focus/typewriter domain
3. Task 6（测试迁移）可由独立 agent 并行推进，但必须在 Task 4/5 完成后 rebase 一次。

### 必须串行

1. Task 1 必须最先完成（目录与边界基线）。
2. Task 5 必须晚于 Task 3/4（依赖已抽离模块）。
3. Task 7 必须最后执行（清理动作依赖全量稳定）。

### 协作约束

1. 每个 agent 只负责一个子域，禁止跨域大改。
2. 每个 agent 必须附带对应测试。
3. 合并顺序按“骨架 -> 布局/集成 -> 领域 -> 编排 -> 测试 -> 清理”。

---

## Execution Handoff

Plan complete and saved to `docs/plans/2026-03-05-editor-textarea-refactor-implementation-plan.md`. Two execution options:

1. Subagent-Driven (this session) - dispatch fresh subagent per task with review checkpoints.
2. Parallel Session (separate) - open a new session with executing-plans skill for batched execution.

