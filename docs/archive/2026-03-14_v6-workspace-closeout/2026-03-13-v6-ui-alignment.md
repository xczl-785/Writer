# V6 Workspace UI Alignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 严格按照 `v6_workspace_v5_base.html` 原型图，修复当前 React 代码库中 V6 工作区 UI 的视觉和交互遗漏。

**Architecture:** 
- 提取原型图中的 Tailwind 类名和 DOM 结构，直接应用到现有的 React 组件中。
- 补充缺失的交互逻辑（如拖拽反馈、状态栏动态显示）。
- 保持现有的状态管理（Zustand）和业务逻辑不变，仅修改视图层。

**Tech Stack:** React, Tailwind CSS, Lucide Icons, Zustand

---

### Task 1: 空状态界面 (EmptyStateWorkspace) 视觉与交互对齐

**Files:**
- Modify: `src/ui/workspace/EmptyStateWorkspace.tsx`
- Modify: `src/ui/workspace/EmptyStateWorkspace.css` (如果需要，尽量移除自定义 CSS，改用 Tailwind)

**Step 1: 提取原型图结构**
从 `v6_workspace_v5_base.html` 第 125-166 行提取 `#empty-state` 的 DOM 结构和 Tailwind 类名。

**Step 2: 重构 EmptyStateWorkspace.tsx**
- 替换现有的 JSX 结构，严格使用原型图的类名。
- 确保 Logo 使用 `lucide-react` 的 `Sparkles` 图标。
- 确保按钮样式为 `bg-zinc-900 text-white` 和 `border border-zinc-200 text-zinc-600`。
- 确保"最近打开"区域的标题带有左右横线。

**Step 3: 补充拖拽反馈逻辑**
- 在组件上添加 `onDragEnter`, `onDragLeave`, `onDragOver`, `onDrop` 事件。
- 当 `isDragging` 为 true 时，显示原型图第 151-158 行的拖拽反馈 UI（`FolderDown` 图标，"添加到工作区"文字，`border-zinc-300 bg-zinc-50`）。

**Step 4: 运行自检**
Run: `npx tsc --noEmit && pnpm lint src/ui/workspace/EmptyStateWorkspace.tsx`
Expected: 无错误

**Step 5: Commit**
```bash
git add src/ui/workspace/EmptyStateWorkspace.tsx src/ui/workspace/EmptyStateWorkspace.css
git commit -m "fix(ui): align EmptyStateWorkspace with v5_base prototype"
```

---

### Task 2: 侧边栏与文件树 (Sidebar & FileTree) 视觉对齐

**Files:**
- Modify: `src/ui/sidebar/Sidebar.tsx`
- Modify: `src/ui/sidebar/WorkspaceRootHeader.tsx`
- Modify: `src/ui/sidebar/FileTreeNode.tsx`

**Step 1: 修复 Sidebar Header 和搜索框**
- `Sidebar.tsx`: Header 底部边框改为 `border-transparent`。
- 标题根据状态在 `FILES` 和 `EXPLORER` 之间切换。
- 搜索框图标绝对定位 `left-2 top-2`。

**Step 2: 修复 WorkspaceRootHeader**
- 布局改为 `justify-between px-3 py-1.5`。
- 文件夹图标使用线框风格（`lucide-react` 的 `Folder` 默认即是），颜色 `text-zinc-600`。
- 名称加粗 `font-bold text-zinc-800`。
- 移除按钮 hover 显示 `opacity-0 group-hover:opacity-100`，颜色 `hover:text-red-500 text-zinc-300`。
- 分隔线紧跟 Header 下方：`<div className="h-px bg-zinc-200 mx-3 mb-1 opacity-70"></div>`。

**Step 3: 修复 FileTreeNode**
- 缩进使用 `ml-6` (24px)。
- 未选中状态：文字 `text-zinc-500`，hover 时 `group-hover:text-zinc-900`，背景 `hover:bg-zinc-100/50`。
- 选中状态：背景 `bg-blue-50/50`，文字 `text-zinc-900`。
- 左侧指示条：绝对定位 `left-[-24px] top-1 bottom-1 w-[3px] bg-blue-500 rounded-r-full`。

**Step 4: 运行自检**
Run: `npx tsc --noEmit && pnpm lint src/ui/sidebar/`
Expected: 无错误

**Step 5: Commit**
```bash
git add src/ui/sidebar/
git commit -m "fix(ui): align Sidebar and FileTree with v5_base prototype"
```

---

### Task 3: 状态栏 (StatusBar) 视觉与逻辑对齐

**Files:**
- Modify: `src/ui/statusbar/StatusBar.tsx`

**Step 1: 移除 SYNC 标识**
- 删除状态栏右下角的 Git SYNC 相关 UI 和逻辑。
- 保留一个 `<span className="w-2"></span>` 作为占位（参考原型图第 233 行）。

**Step 2: 添加工作区标识**
- 在左侧呼吸灯和"已保存"文案后，添加工作区标识区域。
- 结构：`<div className="border-l border-zinc-100 pl-3 flex items-center"><span className="text-zinc-400 font-medium">{workspaceName}</span></div>`。

**Step 3: 实现动态显示逻辑**
- 从 `useWorkspaceStore` 获取 `folders`。
- 如果 `folders.length === 0`：隐藏工作区标识。
- 如果 `folders.length === 1`：显示 `folders[0].name`，正常字体。
- 如果 `folders.length > 1`：显示 `未命名工作区 (未保存)`，使用 `italic` 斜体（如果 `workspaceFile` 为空）。如果已保存，显示工作区名称。

**Step 4: 运行自检**
Run: `npx tsc --noEmit && pnpm lint src/ui/statusbar/StatusBar.tsx`
Expected: 无错误

**Step 5: Commit**
```bash
git add src/ui/statusbar/StatusBar.tsx
git commit -m "fix(ui): align StatusBar with v5_base prototype and remove git sync"
```

---

### Task 4: 文件树拖拽反馈提示 (Drag & Drop Feedback)

**Files:**
- Modify: `src/ui/sidebar/Sidebar.tsx`
- Modify: `src/ui/sidebar/FileTreeNode.tsx`

**Step 1: 定义拖拽状态**
- 在 `Sidebar.tsx` 或全局状态中维护 `isDraggingOverFileTree` 状态。

**Step 2: 实现文件树区域的拖拽反馈**
- 当外部文件/文件夹拖拽到 `#file-list` 区域时，显示视觉反馈。
- 视觉反馈：添加边框高亮 `border-2 border-dashed border-blue-400`。
- 显示半透明遮罩层，提示文字："释放以添加到工作区"（参考原型图风格）。

**Step 3: 运行自检**
Run: `npx tsc --noEmit`
Expected: 无错误

**Step 4: Commit**
```bash
git add src/ui/sidebar/
git commit -m "feat(ui): add drag and drop feedback to file tree"
```
