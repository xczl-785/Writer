# About Writer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在 Windows Help 菜单接入 About Writer 对话框，并展示 Writer 自身图标、版本与占位入口。

**Architecture:** 复用 App 现有面板挂载模式，在 `App.tsx` 持有 About 面板开关状态；通过新的 help 命令注册 `menu.help.about`；保持 Release Notes / Documentation 仍为占位但在 About 中可见。菜单 schema、native menu、i18n 与 capability 同步更新。

**Tech Stack:** React 19、TypeScript、Vitest、Tauri 2

---

### Task 1: 锁定 About 行为

**Files:**
- Create: `docs/plans/2026-03-21-about-writer.md`
- Create: `src/app/AppAboutBehavior.test.ts`
- Modify: `src/ui/chrome/menuState.test.ts`

**Step 1: Write the failing test**
- 新增 source-contract 测试，断言：
  - `App.tsx` 包含 `isAboutOpen`、`openAbout`、`<AboutWriterPanel`
  - 命令层注册 `menu.help.about`
  - About 面板使用 `/icon.svg`
  - `menu.help.about` 在可用 schema 下可启用

**Step 2: Run test to verify it fails**
Run: `npm test -- src/app/AppAboutBehavior.test.ts src/ui/chrome/menuState.test.ts`
Expected: FAIL，因为 About 尚未接入。

**Step 3: Write minimal implementation**
- 接入 About 面板组件、help commands、schema/native menu enable、i18n。

**Step 4: Run test to verify it passes**
Run: `npm test -- src/app/AppAboutBehavior.test.ts src/ui/chrome/menuState.test.ts`
Expected: PASS

**Step 5: Commit**
Run: `git add ... && git commit -m "feat: add about writer panel"`

### Task 2: 同步文档与验证

**Files:**
- Modify: `docs/capability/window-chrome.md`（如入口面有变化则补充）
- Optional: 记录 prototype 仍留在 `docs/current/原型图/`

**Step 1: Update docs**
- 记录 Help -> About 入口与现阶段占位项。

**Step 2: Verify**
Run: `npm test -- src/app/AppAboutBehavior.test.ts src/ui/chrome/menuState.test.ts src/app/AppSettingsBehavior.test.ts && npm run lint -- src/app/App.tsx src/app/commands src/ui/components/About src/ui/chrome/menuSchema.ts src/ui/chrome/menuState.ts src/shared/i18n/messages.ts`

**Step 3: Commit**
Run: `git add ... && git commit -m "docs: record about writer entry"`
