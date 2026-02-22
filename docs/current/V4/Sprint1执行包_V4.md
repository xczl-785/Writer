# Sprint1 执行包（V4 Editor 拆分）

## 1. 目标

将 Editor.tsx（1319行）拆分为多个职责单一的模块，提升代码可维护性和可测试性。

## 2. 任务拆分

- [ ] S1-V4-01 Toolbar 组件拆分
- [ ] S1-V4-02 FindReplacePanel 组件拆分
- [ ] S1-V4-03 InsertTablePopover 组件拆分
- [ ] S1-V4-04 hooks 抽取（useFindReplace, useToolbarCommands, useEditorShortcuts）
- [ ] S1-V4-05 常量提取与配置化
- [ ] S1-V4-06 Editor.tsx 主文件精简
- [ ] S1-V4-07 单元测试补充

## 3. QA 清单

| 用例ID      | 检查项                  | 期望结果                               | 结果 | 证据 |
| ----------- | ----------------------- | -------------------------------------- | ---- | ---- |
| QA-S1-V4-01 | Toolbar 组件功能        | 所有工具栏按钮功能正常，快捷键有效     |      |      |
| QA-S1-V4-02 | FindReplacePanel 功能   | 查找替换功能正常，无回归               |      |      |
| QA-S1-V4-03 | InsertTablePopover 功能 | 表格插入弹窗功能正常                   |      |      |
| QA-S1-V4-04 | hooks 功能              | 编辑器状态同步正常，无回归             |      |      |
| QA-S1-V4-05 | 常量配置生效            | 配置值正确应用，无硬编码残留           |      |      |
| QA-S1-V4-06 | Editor.tsx 行数         | 主文件 < 300 行                        |      |      |
| QA-S1-V4-07 | 自动化门禁              | `npm run test`、`npm run build` 均通过 |      |      |
| QA-S1-V4-08 | 功能对等验证            | 所有 V3 功能正常工作                   |      |      |

## 4. DoD

1. S1-V4-01~S1-V4-07 全部完成
2. Editor.tsx 主文件 < 300 行
3. 所有现有测试通过
4. 新增模块有对应测试
5. FR-V4-01、FR-V4-04 在追溯矩阵中状态更新

## 5. 实施计划

### 5.1 实施顺序

```
Phase 1: 基础设施
├── S1-V4-05 常量提取（优先，其他模块依赖）
└── S1-V4-04 hooks 抽取（优先，组件依赖）

Phase 2: 组件拆分
├── S1-V4-01 Toolbar 组件拆分
├── S1-V4-02 FindReplacePanel 组件拆分
└── S1-V4-03 InsertTablePopover 组件拆分

Phase 3: 整合与测试
├── S1-V4-06 Editor.tsx 主文件精简
└── S1-V4-07 单元测试补充
```

### 5.2 预估改动范围

```
新增文件：
├── src/ui/editor/components/Toolbar.tsx
├── src/ui/editor/components/ToolbarButton.tsx
├── src/ui/editor/components/ToolbarGroup.tsx
├── src/ui/editor/components/FindReplacePanel.tsx
├── src/ui/editor/components/InsertTablePopover.tsx
├── src/ui/editor/hooks/useFindReplace.ts
├── src/ui/editor/hooks/useToolbarCommands.ts
├── src/ui/editor/hooks/useEditorShortcuts.ts
├── src/ui/editor/hooks/useEditorState.ts
├── src/ui/editor/hooks/useTableOperations.ts
├── src/ui/editor/types.ts
├── src/ui/editor/constants.ts
├── src/config/editor.ts
└── src/ui/editor/components/*.test.ts (测试文件)

修改文件：
├── src/ui/editor/Editor.tsx (大幅精简)
└── src/services/autosave/AutosaveService.ts (使用配置常量)
```

### 5.3 风险与防护

| 风险               | 影响 | 防护措施                   |
| ------------------ | ---- | -------------------------- |
| 拆分引入回归       | 高   | 每次拆分后运行全量测试     |
| hooks 依赖关系复杂 | 中   | 先梳理依赖，再逐步抽取     |
| 组件通信复杂       | 中   | 保持 props 和 context 简单 |
| 测试覆盖不足       | 中   | 拆分同时补充测试           |

## 6. 详细拆分方案

### 6.1 S1-V4-01 Toolbar 组件拆分

**目标**：将工具栏渲染逻辑从 Editor.tsx 抽取到独立组件

**输入**：

- `Editor.tsx` 第 944-1312 行（工具栏 JSX）
- `TOOLBAR_COMMANDS` 常量定义

**输出**：

- `src/ui/editor/components/Toolbar.tsx`
- `src/ui/editor/components/ToolbarButton.tsx`
- `src/ui/editor/components/ToolbarGroup.tsx`

**接口设计**：

```typescript
interface ToolbarProps {
  editor: TiptapEditor;
  isToolbarEnabled: boolean;
  statusText: string;
  onStatusChange: (status: string) => void;
}
```

### 6.2 S1-V4-02 FindReplacePanel 组件拆分

**目标**：将查找替换面板抽取到独立组件

**输入**：

- `Editor.tsx` 第 1165-1307 行（查找替换 JSX）
- `collectFindTextMatches` 函数
- `getActiveFindMatchIndex` 函数

**输出**：

- `src/ui/editor/components/FindReplacePanel.tsx`

**接口设计**：

```typescript
interface FindReplacePanelProps {
  editor: TiptapEditor;
  isOpen: boolean;
  isReplaceMode: boolean;
  onClose: () => void;
}
```

### 6.3 S1-V4-03 InsertTablePopover 组件拆分

**目标**：将表格插入弹窗抽取到独立组件

**输入**：

- `Editor.tsx` 第 1049-1143 行（表格弹窗 JSX）
- `clampTableDim` 函数

**输出**：

- `src/ui/editor/components/InsertTablePopover.tsx`

**接口设计**：

```typescript
interface InsertTablePopoverProps {
  editor: TiptapEditor;
  isOpen: boolean;
  onClose: () => void;
}
```

### 6.4 S1-V4-04 hooks 抽取

**目标**：将编辑器相关逻辑抽取到自定义 hooks

**输出**：

- `useFindReplace.ts` - 查找替换状态与操作
- `useToolbarCommands.ts` - 工具栏命令处理
- `useEditorShortcuts.ts` - 快捷键绑定
- `useEditorState.ts` - 编辑器状态同步
- `useTableOperations.ts` - 表格操作

### 6.5 S1-V4-05 常量提取

**目标**：将硬编码值提取到配置文件

**输出**：

- `src/config/editor.ts`

**内容**：

```typescript
export const EDITOR_CONFIG = {
  autosave: {
    debounceMs: 800,
  },
  table: {
    minRows: 1,
    maxRows: 20,
    minCols: 1,
    maxCols: 20,
    defaultRows: 3,
    defaultCols: 3,
  },
  findReplace: {
    maxMatches: 1000,
  },
  status: {
    transientTimeoutMs: 1500,
  },
} as const;
```

## 7. 验收证据记录模板

| 项目            | 命令/操作                        | 结果 | 证据路径 |
| --------------- | -------------------------------- | ---- | -------- |
| 自动化测试      | `npm run test`                   |      |          |
| 构建验证        | `npm run build`                  |      |          |
| Lint 检查       | `npm run lint`                   |      |          |
| Editor.tsx 行数 | `wc -l src/ui/editor/Editor.tsx` |      |          |
| 功能对等验证    | 手工测试清单                     |      |          |
