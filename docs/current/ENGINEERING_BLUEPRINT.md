# Engineering Blueprint（Step D）

## 1. 目标
在不扩展 V1 范围的前提下，定义可实现、可测试、可扩展的工程蓝图，作为 Step E 任务拆分唯一输入。

## 2. 设计原则
1. 边界优先：模块职责单一，跨模块仅通过明确接口通信。
2. 本地优先：文件系统为事实源（Source of Truth）。
3. 失败可见：保存与文件操作失败必须可观测。
4. 扩展预留：先留扩展点，不提前引入插件系统。

## 3. 模块划分（V1）

### 3.1 `app`
- 职责：应用生命周期、窗口级状态、全局路由（最小化）。
- 依赖：`workspace`, `ui`, `state`。

### 3.2 `workspace`
- 职责：工作区选择/恢复、当前工作区上下文管理。
- 依赖：`services/fs`。

### 3.3 `filetree`
- 职责：目录树读取、展开折叠、文件选择、新建/重命名/删除交互。
- 依赖：`services/fs`, `state`。

### 3.4 `editor`
- 职责：TipTap 编辑器实例、快捷键、内容变更事件、图片粘贴入口。
- 依赖：`services/autosave`, `services/images`, `state`。

### 3.5 `services/fs`
- 职责：文件系统读写抽象（list/read/write/rename/delete），原子写入。
- 依赖：Tauri FS API。

### 3.6 `services/autosave`
- 职责：800ms 防抖、失焦保存、关闭前强制保存。
- 依赖：`services/fs`, `state`。

### 3.7 `services/images`
- 职责：剪贴板图片落盘、命名生成、引用回写。
- 依赖：`services/fs`。

### 3.8 `state`
- 职责：应用状态仓库（工作区、文件树、编辑文档、保存状态）。
- 依赖：Zustand。

### 3.9 `ui`
- 职责：纯展示组件（Sidebar/EditorShell/StatusBar/Dialog）。
- 依赖：`state`（只读 + 事件分发）。

## 4. 可扩展边界（关键）

### 4.1 服务接口层稳定化
所有业务能力通过服务接口暴露，V1 禁止跨模块直连底层 API。后续扩展（搜索、导出、同步）只新增服务，不改调用方语义。

### 4.2 文档能力扩展点
`editor` 内定义 `DocumentFeature` 注册机制（内部使用，不对外开放插件）：
- `id`
- `mount(editor)`
- `unmount()`
V1 仅注册：基础格式、代码块、图片粘贴。

### 4.3 状态扩展策略
`state` 采用领域切片（workspace/filetree/editor/status），后续能力通过新增 slice 扩展，避免单仓库膨胀。

### 4.4 事件总线（轻量）
定义内部事件枚举（不引入重型总线）：
- `WORKSPACE_OPENED`
- `FILE_SELECTED`
- `DOC_CHANGED`
- `SAVE_STARTED/SAVE_SUCCEEDED/SAVE_FAILED`
- `IMAGE_PASTE_STARTED/IMAGE_PASTE_FAILED`
便于后续接入日志与诊断。

## 5. 核心接口契约（V1）

### 5.1 `FsService`
```ts
interface FsService {
  listTree(rootPath: string): Promise<TreeNode[]>;
  readFile(path: string): Promise<string>;
  writeFileAtomic(path: string, content: string): Promise<void>;
  createFile(path: string, initial?: string): Promise<void>;
  renamePath(oldPath: string, newPath: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  ensureDir(path: string): Promise<void>;
}
```

### 5.2 `AutosaveService`
```ts
interface AutosaveService {
  schedule(path: string, content: string): void; // 800ms debounce, content=serialized Markdown
  flush(path: string, content: string): Promise<void>; // blur/before-close
  cancel(path: string): void;
}
```

### 5.3 `ImageService`
```ts
interface ImageService {
  saveClipboardImage(docPath: string): Promise<{ imagePath: string; relativeRef: string }>;
}
```

### 5.4 `MarkdownService`
```ts
type EditorJSON = Record<string, unknown>;

interface MarkdownService {
  parse(md: string): Promise<EditorJSON>;       // Markdown -> ProseMirror JSON
  serialize(doc: EditorJSON): Promise<string>;  // ProseMirror JSON -> Markdown
}
```

## 6. 数据流（关键路径）

### 6.1 打开工作区
1. 用户选择目录 -> `workspace.open(root)`
2. `FsService.listTree(root)` -> 更新 `filetree slice`
3. 加载默认文件或空白态

### 6.2 选择文件
1. `filetree.select(path)`
2. 若当前文档 `dirty=true`，先执行 `await autosave.flush(currentPath, currentMarkdown)`
3. `FsService.readFile(path)`
4. `editor.load(content)`
5. 更新 `activeDocument` 状态

### 6.3 输入与自动保存
1. `editor.onChange(content)` -> `DOC_CHANGED`
2. `autosave.schedule(path, content)`
3. 防抖到点 -> `writeFileAtomic`
4. 状态更新 `SAVE_*`
5. 关闭前保存采用 `WindowCloseRequested`（Tauri）+ `beforeunload`（前端）双保险，触发 `flush`（超时上限 3s）

### 6.4 图片粘贴
1. `editor.onPaste(image)` -> `ImageService.saveClipboardImage(docPath)`
2. `ensureDir(assets)` + 文件命名 + 写入
3. 将相对引用插入编辑器

### 6.5 重命名/删除
1. UI 二次确认（删除）/内联确认（重命名）
2. `FsService.renamePath/deleteFile`
3. 刷新 filetree + 修正 active document 状态

## 7. 目录结构（落仓建议）
```text
docs/
  current/
  frozen/
  archive/
src/
  app/
  workspace/
  filetree/
  editor/
  services/
    fs/
    autosave/
    images/
  state/
    slices/
  ui/
    sidebar/
    editor/
    statusbar/
src-tauri/
```

## 8. 工程规范
1. TypeScript 严格模式开启。
2. 所有服务层必须有错误类型与用户可见映射。
3. 状态变更需可追踪（event + status enum）。
4. UI 组件禁止直接调用 Tauri API。

## 9. 门禁项实现计划（Step D 强制）

### D-007 Roundtrip Spike
- 目标：验证 `.md -> TipTap -> .md` 语义保持。
- 覆盖：标题、列表、代码块、图片引用。
- 通过标准：语义一致（允许空白微差异）。
- 可执行产物：
  1. `spike/roundtrip/roundtrip.test.ts`
  2. `spike/roundtrip/README.md`
  3. `docs/current/SPIKE_ROUNDTRIP_REPORT.md`
- 失败处理：进入备选内核评估流程（不直接硬切）。

### D-009 原子写入
- 流程：
  1. 写入 `target.tmp.{random}`
  2. flush
  3. rename 到 `target`
- 要求：任一步失败不破坏原文件。
- 建议：启动时清理残留 `.tmp.*` 文件（不阻塞 Step E）。

## 10. Step E 输入清单
Step E 拆任务时必须覆盖：
1. `FsService` 全接口 + 原子写入
2. `AutosaveService` 三触发策略
3. `ImageService` 粘贴落盘链路
4. `editor/filetree/workspace/state` 五域最小闭环
5. Roundtrip Spike 与结果记录

## 11. Step D 复盘占位
- 结果：待确认
- 核心结论：待填写
- 发现问题：待填写
- 调整决策：待填写
- 是否进入 Step E：待确认
