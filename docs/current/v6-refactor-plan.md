# V6 架构重构计划

**创建日期**: 2026-03-01
**状态**: 待评审
**目标**: 优化代码结构，输出架构文档，提升可维护性

---

## 一、架构现状评估

### 1.1 整体架构评分

| 模块       | 评分       | 说明                                               |
| ---------- | ---------- | -------------------------------------------------- |
| 状态管理   | ⭐⭐⭐⭐   | Zustand 多 Store 模式，职责清晰，不建议大改        |
| 服务层     | ⭐⭐⭐⭐   | 职责边界清晰，FsService 统一封装后端调用           |
| 编辑器核心 | ⭐⭐⭐     | TipTap 扩展组织良好，但 Editor.tsx 过大（1442 行） |
| UI 组件    | ⭐⭐⭐⭐   | 轻量级架构，组件粒度适中                           |
| 后端 Rust  | ⭐⭐⭐⭐⭐ | 双模块设计简洁，命令原子化                         |
| 应用入口   | ⭐⭐⭐     | App.tsx 菜单命令注册过于集中（50+ 个）             |

**结论**: 架构整体合理，**无需大规模重构**，主要问题是**单文件过大**和**文档缺失**。

---

## 二、重构范围

### 2.1 必须重构（Phase 1）

#### P1-1: Editor.tsx 拆分

**问题**: `src/ui/editor/Editor.tsx` 1442 行，职责过多：

- TipTap 编辑器配置
- 斜杠菜单逻辑（851-1170 行）
- 浮动菜单定位
- 查找替换面板
- 工具栏交互
- 图片粘贴处理
- 状态同步

**重构方案**:

```
src/ui/editor/
├── Editor.tsx              # 主容器（精简后 ~300 行）
├── extensions/             # 扩展配置目录（新建）
│   ├── index.ts            # 扩展注册入口
│   ├── toolbarShortcuts.ts # 工具栏快捷键扩展
│   ├── findReplaceShortcuts.ts
│   └── keydownHandler.ts
├── menus/                  # 菜单组件（新建）
│   ├── SlashMenu.tsx       # 斜杠菜单
│   ├── BubbleMenuWrapper.tsx
│   └── ToolbarWrapper.tsx
├── panels/                 # 面板组件（新建）
│   └── FindReplaceWrapper.tsx
└── hooks/                  # 编辑器专用 hooks（新建）
    ├── useEditorSetup.ts   # 编辑器实例创建
    ├── useSlashMenu.ts     # 斜杠菜单状态
    └── useEditorSync.ts    # 状态同步
```

**验收标准**:

- [ ] Editor.tsx < 400 行
- [ ] 所有测试通过（`pnpm test`）
- [ ] 功能无退化

---

#### P1-2: App.tsx 菜单命令抽取

**问题**: `src/app/App.tsx` 中 50+ 个菜单命令注册集中在 useEffect 中

**重构方案**:

```
src/app/
├── App.tsx                 # 主组件（精简）
├── commands/               # 命令注册模块（新建）
│   ├── index.ts            # 统一注册入口
│   ├── fileCommands.ts     # 文件操作命令
│   ├── editCommands.ts     # 编辑操作命令
│   ├── formatCommands.ts   # 格式化命令
│   ├── paragraphCommands.ts # 段落命令
│   └── viewCommands.ts     # 视图命令
└── useNativeMenuBridge.ts  # 保持不变
```

**实现模式**:

```typescript
// commands/fileCommands.ts
export function registerFileCommands(runner: CommandRunner): CleanupFn {
  const cleanups: CleanupFn[] = [];

  cleanups.push(menuCommandBus.register('menu.file.save', () => runner.save()));
  // ...

  return () => cleanups.forEach((fn) => fn());
}

// commands/index.ts
export function registerAllCommands(runner: CommandRunner): CleanupFn {
  const cleanups = [
    registerFileCommands(runner),
    registerEditCommands(runner),
    // ...
  ];
  return () => cleanups.forEach((fn) => fn());
}
```

**验收标准**:

- [ ] App.tsx < 150 行
- [ ] 命令注册逻辑可独立测试
- [ ] 功能无退化

---

### 2.2 建议优化（Phase 2）

#### P2-1: ErrorService 解耦

**问题**: `ErrorService` 直接 import `useStatusStore`，服务层与状态层紧耦合

**方案**: 引入回调注入

```typescript
// 之前
import { useStatusStore } from '../state';
export const ErrorService = {
  log(error) {
    useStatusStore.getState().setError(error.message);
  },
};

// 之后
type StatusReporter = (message: string) => void;
export const ErrorService = {
  init(reporter: StatusReporter) {
    this.reporter = reporter;
  },
  log(error) {
    this.reporter?.(error.message);
  },
};
// 在 App.tsx 初始化
ErrorService.init((msg) => useStatusStore.getState().setError(msg));
```

**优先级**: 低（当前不影响开发效率）

---

#### P2-2: Dialog 组件化

**问题**: `ConfirmDialog` 使用原生 DOM 创建，与 React 组件体系不一致

**方案**: 重构为 React 组件 + Portal

**优先级**: 低

---

### 2.3 文档输出（Phase 3）

#### 目标目录结构

```
docs/全局资产/工程/
├── 编码规范.md          # 已存在
├── Git工作流.md         # 已存在
└── 技术/                # 新建目录
    ├── README.md        # 技术文档索引
    ├── 前端架构.md       # React + Zustand 架构
    ├── 编辑器架构.md     # TipTap 扩展机制
    ├── 服务层设计.md     # 前端服务层
    ├── 后端架构.md       # Tauri + Rust
    └── 命令系统.md       # 菜单命令总线
```

#### 文档内容要求

| 文档          | 必须包含                                             |
| ------------- | ---------------------------------------------------- |
| 前端架构.md   | 状态管理（Zustand 多 Store）、数据流图、slice 职责表 |
| 编辑器架构.md | TipTap 扩展清单、自定义扩展实现、工具栏/斜杠菜单机制 |
| 服务层设计.md | 服务职责表、依赖关系图、Tauri invoke 调用清单        |
| 后端架构.md   | Tauri 命令清单、文件系统抽象、菜单事件机制           |
| 命令系统.md   | menuCommandBus 设计、命令注册流程、命令 ID 清单      |

---

## 三、执行计划

### Phase 1: 核心重构（预计 3-5 个工作日）

| 步骤 | 任务                         | 产出                        |
| ---- | ---------------------------- | --------------------------- |
| 1.1  | Editor.tsx 拆分 - 扩展目录   | `src/ui/editor/extensions/` |
| 1.2  | Editor.tsx 拆分 - 菜单组件   | `src/ui/editor/menus/`      |
| 1.3  | Editor.tsx 拆分 - hooks 抽取 | `src/ui/editor/hooks/`      |
| 1.4  | Editor.tsx 主文件精简        | Editor.tsx < 400 行         |
| 1.5  | App.tsx 命令抽取             | `src/app/commands/`         |
| 1.6  | 测试验证                     | 全部测试通过                |

### Phase 2: 架构文档（预计 2 个工作日）

| 步骤 | 任务               | 产出                       |
| ---- | ------------------ | -------------------------- |
| 2.1  | 创建技术目录       | `docs/全局资产/工程/技术/` |
| 2.2  | 编写前端架构文档   | 前端架构.md                |
| 2.3  | 编写编辑器架构文档 | 编辑器架构.md              |
| 2.4  | 编写服务层设计文档 | 服务层设计.md              |
| 2.5  | 编写后端架构文档   | 后端架构.md                |
| 2.6  | 编写命令系统文档   | 命令系统.md                |

### Phase 3: 可选优化（按需执行）

| 步骤 | 任务                         | 优先级 |
| ---- | ---------------------------- | ------ |
| 3.1  | ErrorService 解耦            | 低     |
| 3.2  | Dialog 组件化                | 低     |
| 3.3  | 添加 Zustand devtools 中间件 | 低     |

---

## 四、风险与缓解

| 风险                          | 影响 | 缓解措施                     |
| ----------------------------- | ---- | ---------------------------- |
| Editor.tsx 拆分影响编辑器功能 | 高   | 小步提交，每步运行测试       |
| 命令注册拆分遗漏              | 中   | 拆分后对比命令清单，逐个验证 |
| 文档与代码不同步              | 低   | 在编码规范中增加文档更新规则 |

---

## 五、验收标准

### 代码层面

- [ ] Editor.tsx < 400 行
- [ ] App.tsx < 150 行
- [ ] 全部测试通过（`pnpm test`）
- [ ] ESLint 无错误（`pnpm lint`）
- [ ] 构建成功（`pnpm build`）

### 文档层面

- [ ] 技术目录存在且包含 5 份架构文档
- [ ] 每份文档包含架构图示（Mermaid 或文字描述）
- [ ] 决策日志已更新（`docs/全局资产/治理/决策日志.md`）

---

## 六、参考资料

- 探索结果：本次架构分析的 6 个 explore 任务输出
- 现有规范：`docs/全局资产/工程/编码规范.md`
- 技术栈：React 19 + TipTap 3 + Zustand 5 + Tauri 2 + Rust
