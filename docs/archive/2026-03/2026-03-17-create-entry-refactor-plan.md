# Create Entry Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 收敛顶部菜单、侧边栏按钮、文件树右键三套“新建文件/新建文件夹”入口的语义与命令链路，去掉当前残留的 UI 事件绕行与分散判定。

**Architecture:** 保持现有 `menuCommandBus -> command handler -> sidebar` 的主链路不变，但把“创建入口”的目标选择、工作区可用性、侧边栏显隐与命令映射抽成单一职责模块，避免 `fileCommands.ts` 与 `Sidebar.tsx` 分别持有半套语义。重构阶段不改产品语义，只做结构收敛与回归补强；文档同步放到后续独立步骤。

**Tech Stack:** React 19, TypeScript, Zustand, Vitest, Tauri 2 / Rust

---

### Task 1: 盘点并冻结当前创建语义

**Files:**
- Modify: `E:\Project\Writer\src\app\commands\fileCommandsNewBehavior.test.ts`
- Modify: `E:\Project\Writer\src\ui\sidebar\SidebarMenuCommandWorkspaceBehavior.test.ts`
- Modify: `E:\Project\Writer\src\ui\sidebar\SidebarCreateButtonsBehavior.test.ts`
- Create: `E:\Project\Writer\src\ui\sidebar\SidebarCreateCommandRouting.test.ts`

**Step 1: 写失败测试，覆盖完整语义面**

补齐以下行为断言：
- 顶部 `menu.file.new` 最终走到 `new-file`
- 顶部 `menu.file.new_folder` 最终走到 `new-folder`
- 侧边栏按钮与右键菜单在“刚打开工作区”场景下使用同一可用性判定
- 侧边栏收到未知创建命令时无副作用

**Step 2: 运行测试确认 RED**

Run:

```bash
npm test -- src/app/commands/fileCommandsNewBehavior.test.ts src/ui/sidebar/SidebarMenuCommandWorkspaceBehavior.test.ts src/ui/sidebar/SidebarCreateButtonsBehavior.test.ts src/ui/sidebar/SidebarCreateCommandRouting.test.ts
```

Expected: 至少新增用例失败，暴露当前语义散落的问题。

**Step 3: 最小修正测试夹具**

若失败来自测试搭建问题，而非真实行为缺口，只修测试夹具，不写生产代码。

**Step 4: 再跑一次确保 RED 合法**

Run 同上命令，确认失败原因是“未重构前行为/结构不满足新约束”。

**Step 5: Commit**

```bash
git add E:\Project\Writer\src\app\commands\fileCommandsNewBehavior.test.ts E:\Project\Writer\src\ui\sidebar\SidebarMenuCommandWorkspaceBehavior.test.ts E:\Project\Writer\src\ui\sidebar\SidebarCreateButtonsBehavior.test.ts E:\Project\Writer\src\ui\sidebar\SidebarCreateCommandRouting.test.ts
git commit -m "test: lock create entry behavior"
```

### Task 2: 抽出创建入口路由与可用性语义

**Files:**
- Create: `E:\Project\Writer\src\domains\workspace\services\createEntryCommands.ts`
- Modify: `E:\Project\Writer\src\app\commands\fileCommands.ts`
- Modify: `E:\Project\Writer\src\ui\sidebar\Sidebar.tsx`
- Modify: `E:\Project\Writer\src\ui\chrome\menuState.ts`

**Step 1: 写失败测试**

为新模块设计最小单元测试，覆盖：
- 菜单命令 ID 到 sidebar create command 的映射
- “需要先展示侧边栏再下发命令”的统一流程
- 基于当前工作区路径的可创建判定

建议新增：
- `E:\Project\Writer\src\domains\workspace\services\createEntryCommands.test.ts`

**Step 2: 运行测试确认 RED**

```bash
npm test -- src/domains/workspace/services/createEntryCommands.test.ts src/app/commands/fileCommandsNewBehavior.test.ts src/ui/sidebar/SidebarCreateCommandRouting.test.ts
```

Expected: 因新模块不存在或旧实现未接线而失败。

**Step 3: 写最小实现**

实现一个集中模块，至少暴露：
- `resolveCreateEntryMenuTarget(menuId)`
- `canCreateFromWorkspace(currentPath)`
- `dispatchCreateEntry(options)`

要求：
- `fileCommands.ts` 不再硬编码 `new-file` / `new-folder` 与 `setTimeout`
- `Sidebar.tsx` 不再散落判断 `detail.id === 'new-file' | 'new-folder'`
- 可创建判定只保留一处真源

**Step 4: 跑测试确认 GREEN**

```bash
npm test -- src/domains/workspace/services/createEntryCommands.test.ts src/app/commands/fileCommandsNewBehavior.test.ts src/ui/sidebar/SidebarMenuCommandWorkspaceBehavior.test.ts src/ui/sidebar/SidebarCreateButtonsBehavior.test.ts src/ui/sidebar/SidebarCreateCommandRouting.test.ts
```

Expected: 全部通过。

**Step 5: 小步整理**

只做无行为变化的清理：
- 提炼常量 `new-file` / `new-folder`
- 删除已废弃的分支判断
- 保持 i18n key 与菜单 ID 不变

**Step 6: Commit**

```bash
git add E:\Project\Writer\src\domains\workspace\services\createEntryCommands.ts E:\Project\Writer\src\domains\workspace\services\createEntryCommands.test.ts E:\Project\Writer\src\app\commands\fileCommands.ts E:\Project\Writer\src\ui\sidebar\Sidebar.tsx E:\Project\Writer\src\ui\chrome\menuState.ts
git commit -m "refactor: centralize create entry command routing"
```

### Task 3: 收敛菜单定义重复与原生/前端一致性校验

**Files:**
- Modify: `E:\Project\Writer\src\ui\chrome\menuSchema.ts`
- Modify: `E:\Project\Writer\src\shared\i18n\messages.ts`
- Modify: `E:\Project\Writer\src-tauri\src\menu.rs`
- Modify: `E:\Project\Writer\src\ui\chrome\FileMenuCreateEntriesBehavior.test.ts`
- Modify: `E:\Project\Writer\src\ui\chrome\NativeFileMenuCreateEntriesBehavior.test.ts`

**Step 1: 写失败测试**

让测试同时约束：
- `menu.file.new` / `menu.file.new_folder` 在前端 schema 和 Tauri 原生菜单都存在
- 可见文案与 i18n key 对齐
- 未来若只改一层，测试立即失败

**Step 2: 运行测试确认 RED**

```bash
npm test -- src/ui/chrome/FileMenuCreateEntriesBehavior.test.ts src/ui/chrome/NativeFileMenuCreateEntriesBehavior.test.ts src/ui/chrome/WindowsMenuBarBehavior.test.ts
```

**Step 3: 最小实现**

如有必要：
- 提取一份共享的“文件菜单创建项定义”常量到 TS 侧
- Rust 侧至少通过稳定测试约束保证同步
- 不尝试做跨语言配置生成，避免过度设计

**Step 4: 跑测试确认 GREEN**

```bash
npm test -- src/ui/chrome/FileMenuCreateEntriesBehavior.test.ts src/ui/chrome/NativeFileMenuCreateEntriesBehavior.test.ts src/ui/chrome/WindowsMenuBarBehavior.test.ts
```

**Step 5: Commit**

```bash
git add E:\Project\Writer\src\ui\chrome\menuSchema.ts E:\Project\Writer\src\shared\i18n\messages.ts E:\Project\Writer\src-tauri\src\menu.rs E:\Project\Writer\src\ui\chrome\FileMenuCreateEntriesBehavior.test.ts E:\Project\Writer\src\ui\chrome\NativeFileMenuCreateEntriesBehavior.test.ts E:\Project\Writer\src\ui\chrome\WindowsMenuBarBehavior.test.ts
git commit -m "refactor: tighten create menu consistency"
```

### Task 4: 全链路回归验证

**Files:**
- Verify only

**Step 1: 运行聚焦回归**

```bash
npm test -- src/app/commands/fileCommandsNewBehavior.test.ts src/ui/chrome/FileMenuCreateEntriesBehavior.test.ts src/ui/chrome/NativeFileMenuCreateEntriesBehavior.test.ts src/ui/chrome/WindowsMenuBarBehavior.test.ts src/ui/sidebar/SidebarCreateButtonsBehavior.test.ts src/ui/sidebar/SidebarMenuCommandWorkspaceBehavior.test.ts src/ui/sidebar/SidebarCreateCommandRouting.test.ts src/domains/workspace/services/createEntryCommands.test.ts
```

Expected: 全绿。

**Step 2: 运行更大范围菜单/侧边栏回归**

```bash
npm test -- src/app src/ui/sidebar src/ui/chrome
```

Expected: 无新增失败。

**Step 3: 人工验证清单**

- 刚打开工作区后，顶部“新建文件”可用
- 顶部“新建文件夹”可用
- 侧边栏“新建文件/新建文件夹”可用
- 文件树右键“新建文件/新建文件夹”可用
- 不打开工作区时，创建入口应保持一致的禁用或错误提示语义

**Step 4: Commit**

```bash
git add -A
git commit -m "test: verify create entry refactor"
```

---

## Notes / Non-Goals

- 本计划**不**同步 `docs/全局资产/技术/命令系统.md` 与其他长期文档；那是下一步独立工作。
- 本计划**不**引入事件总线重写，不把 sidebar command 全面替换成 store/action 架构。
- 若执行中发现“顶部入口是否必须依附 sidebar UI”其实是需求问题，不当作 bug 自行修改，先回到产品语义确认。
