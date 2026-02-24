# Sprint2 执行包（V4 状态管理重构）

## 1. 目标

创建统一的 actions 层，封装跨 store 操作，建立标准化的错误处理机制。

## 2. 任务拆分

- [ ] S2-V4-01 actions 层创建（fileActions, editorActions, workspaceActions）
- [ ] S2-V4-02 跨 store 逻辑迁移（从组件迁移到 actions）
- [ ] S2-V4-03 错误处理标准化（ErrorService 创建与应用）
- [ ] S2-V4-04 组件重构（使用 actions 替代直接 store 调用）
- [ ] S2-V4-05 单元测试补充

## 3. QA 清单

| 用例ID      | 检查项         | 期望结果                               | 结果 | 证据 |
| ----------- | -------------- | -------------------------------------- | ---- | ---- |
| QA-S2-V4-01 | actions 层功能 | 跨 store 操作正常，无回归              |      |      |
| QA-S2-V4-02 | 组件迁移完整性 | 组件中无直接跨 store 操作              |      |      |
| QA-S2-V4-03 | 错误处理一致性 | 所有错误通过统一服务处理               |      |      |
| QA-S2-V4-04 | 自动化门禁     | `npm run test`、`npm run build` 均通过 |      |      |
| QA-S2-V4-05 | 功能对等验证   | 所有 V3 功能正常工作                   |      |      |

## 4. DoD

1. S2-V4-01~S2-V4-05 全部完成
2. 组件中无直接跨 store 操作
3. 所有错误通过 ErrorService 处理
4. FR-V4-02、FR-V4-03 在追溯矩阵中状态更新

## 5. 实施计划

### 5.1 实施顺序

```
Phase 1: 基础设施
├── S2-V4-01 actions 层创建
└── S2-V4-03 错误处理标准化

Phase 2: 迁移
├── S2-V4-02 跨 store 逻辑迁移
└── S2-V4-04 组件重构

Phase 3: 测试
└── S2-V4-05 单元测试补充
```

### 5.2 预估改动范围

```
新增文件：
├── src/state/actions/fileActions.ts
├── src/state/actions/editorActions.ts
├── src/state/actions/workspaceActions.ts
├── src/state/actions/index.ts
├── src/services/error/ErrorService.ts
└── src/state/actions/*.test.ts (测试文件)

修改文件：
├── src/ui/sidebar/Sidebar.tsx (使用 actions)
├── src/workspace/WorkspaceManager.ts (使用 actions)
└── src/app/closeWorkflow.ts (使用 ErrorService)
```

### 5.3 风险与防护

| 风险                 | 影响 | 防护措施                      |
| -------------------- | ---- | ----------------------------- |
| actions 层设计不合理 | 高   | 先设计接口，评审后再实现      |
| 迁移遗漏             | 中   | 使用 grep 搜索直接 store 调用 |
| 错误处理遗漏         | 中   | 使用 grep 搜索 console.error  |

## 6. 详细拆分方案

### 6.1 S2-V4-01 actions 层创建

**目标**：创建统一的 action 层封装跨 store 操作

**输出**：

- `src/state/actions/fileActions.ts`
- `src/state/actions/editorActions.ts`
- `src/state/actions/workspaceActions.ts`
- `src/state/actions/index.ts`

**接口设计**：

```typescript
// src/state/actions/fileActions.ts
export const fileActions = {
  async createFile(path: string, content?: string): Promise<void>;
  async deleteFile(path: string): Promise<void>;
  async renameFile(oldPath: string, newPath: string): Promise<void>;
  async openFile(path: string): Promise<void>;
};

// src/state/actions/editorActions.ts
export const editorActions = {
  initializeFile(path: string, content: string): void;
  updateContent(path: string, content: string): void;
  closeFile(path: string): void;
};

// src/state/actions/workspaceActions.ts
export const workspaceActions = {
  async openWorkspace(): Promise<void>;
  closeWorkspace(): void;
};
```

### 6.2 S2-V4-02 跨 store 逻辑迁移

**目标**：将组件中的跨 store 操作迁移到 actions

**迁移清单**：

| 组件                | 当前操作               | 迁移目标                       |
| ------------------- | ---------------------- | ------------------------------ |
| Sidebar.tsx         | renameFile 跨 store    | fileActions.renameFile         |
| Sidebar.tsx         | deleteNode 跨 store    | fileActions.deleteFile         |
| WorkspaceManager.ts | openFile 跨 store      | fileActions.openFile           |
| WorkspaceManager.ts | openWorkspace 跨 store | workspaceActions.openWorkspace |

### 6.3 S2-V4-03 错误处理标准化

**目标**：建立统一的错误处理服务

**输出**：

- `src/services/error/ErrorService.ts`

**接口设计**：

```typescript
// src/services/error/ErrorService.ts
export const ErrorService = {
  handle(error: unknown, context: string): void;
  handleAsync<T>(promise: Promise<T>, context: string): Promise<T | null>;
};

// 使用示例
try {
  await FsService.deleteNode(path);
} catch (error) {
  ErrorService.handle(error, 'Failed to delete file');
}

// 或使用 handleAsync
const result = await ErrorService.handleAsync(
  FsService.deleteNode(path),
  'Failed to delete file'
);
```

### 6.4 S2-V4-04 组件重构

**目标**：使用 actions 替代直接 store 调用

**重构前**：

```typescript
// Sidebar.tsx
await FsService.renameNode(node.path, newPath);
useWorkspaceStore.getState().renameFile(node.path, newPath);
useEditorStore.getState().renameFile(node.path, newPath);
const nodes = await FsService.listTree(currentPath);
useFileTreeStore.getState().setNodes(nodes);
```

**重构后**：

```typescript
// Sidebar.tsx
await fileActions.renameFile(node.path, newPath);
```

## 7. 验收证据记录模板

| 项目              | 命令/操作                                       | 结果 | 证据路径 |
| ----------------- | ----------------------------------------------- | ---- | -------- |
| 自动化测试        | `npm run test`                                  |      |          |
| 构建验证          | `npm run build`                                 |      |          |
| Lint 检查         | `npm run lint`                                  |      |          |
| 跨 store 调用检查 | `grep -r "useWorkspaceStore.getState()" src/ui` |      |          |
| 错误处理检查      | `grep -r "console.error" src/`                  |      |          |
