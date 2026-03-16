# 领域驱动重构设计

**创建日期**: 2026-03-14
**分支**: refactor/code-quality
**状态**: 设计完成，待实施

---

## 一、背景

Writer 项目经过多次迭代，代码库中存在以下问题：

1. **大文件**：`fs.rs` (982行)、`workspaceActions.ts` (711行)、`App.tsx` (708行)、`EditorImpl.tsx` (649行)
2. **职责混乱**：后端 `fs.rs` 混合了文件操作、Git 状态、工作区文件、配置目录、工作区锁
3. **目录结构扁平**：前端代码按技术分层，但缺乏领域边界
4. **Git 功能废弃**：Git 状态功能已不再需要，应移除

---

## 二、设计目标

1. **领域驱动**：按业务领域组织代码，每个领域自包含
2. **单一职责**：每个模块只负责一件事
3. **清晰边界**：领域间通过明确的接口通信
4. **移除废弃功能**：完全移除 Git 相关代码

---

## 三、整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
├─────────────────────────────────────────────────────────────────┤
│  domains/                                                        │
│  ├── file/          # 文件操作领域                               │
│  ├── editor/        # 编辑器领域                                 │
│  ├── workspace/     # 工作区领域                                 │
│  └── settings/      # 设置领域                                   │
├─────────────────────────────────────────────────────────────────┤
│  shared/            # 共享基础设施                               │
│  ├── i18n/          # 国际化                                     │
│  ├── components/    # 通用组件                                   │
│  └── utils/         # 工具函数                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         Backend (Rust)                           │
├─────────────────────────────────────────────────────────────────┤
│  fs.rs              # 文件系统操作                               │
│  workspace.rs       # 工作区文件操作                             │
│  config.rs          # 应用配置                                   │
│  security.rs        # 安全边界                                   │
│  menu.rs            # 原生菜单                                   │
│  watcher.rs         # 文件监听                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 四、前端领域设计

### 4.1 File 领域

```
src/domains/file/
├── index.ts                    # 领域导出入口
├── services/
│   ├── FsService.ts            # 文件系统操作抽象
│   ├── FsSafety.ts             # 文件操作安全
│   └── FileWatcherService.ts   # 文件监听
├── state/
│   ├── fileStore.ts            # 文件状态 store
│   └── types.ts                # 类型定义
├── ui/
│   ├── FileTree/               # 文件树组件
│   ├── ContextMenu/            # 文件右键菜单
│   └── Breadcrumb/             # 面包屑导航
└── hooks/
    ├── useFileOperations.ts    # 文件操作 hooks
    └── useFileTree.ts          # 文件树 hooks
```

**职责**：
- 文件的 CRUD 操作
- 文件树渲染和交互
- 文件监听和同步

**不包含**：工作区管理、编辑器内容管理

---

### 4.2 Editor 领域

```
src/domains/editor/
├── index.ts                    # 领域导出入口
├── core/
│   ├── Editor.tsx              # 编辑器主组件
│   ├── EditorConfig.ts         # TipTap 配置
│   └── extensions/             # TipTap 扩展
├── domain/
│   ├── typewriter/             # 打字机模式状态机
│   ├── slash/                  # Slash 菜单状态机
│   ├── findReplace/            # 查找替换逻辑
│   ├── focusZen/               # 专注模式逻辑
│   └── scroll/                 # 滚动协调器
├── state/
│   ├── editorStore.ts          # 编辑器状态
│   └── types.ts
├── ui/
│   ├── components/             # 编辑器 UI 组件
│   └── menus/                  # 菜单组件
└── hooks/
    ├── useTypewriterAnchor.ts
    ├── useSlashMenu.ts
    ├── useFindReplace.ts
    └── useToolbarCommands.ts
```

**职责**：
- TipTap 编辑器配置和扩展
- 编辑器状态管理
- 编辑器 UI 组件
- 编辑器领域逻辑（typewriter, slash, find 等）

---

### 4.3 Workspace 领域

```
src/domains/workspace/
├── index.ts                    # 领域导出入口
├── services/
│   ├── WorkspaceService.ts     # 工作区操作
│   ├── WorkspacePersistence.ts # 工作区持久化
│   ├── RecentItemsService.ts   # 最近项目
│   └── WorkspaceLockService.ts # 工作区锁
├── state/
│   ├── workspaceStore.ts       # 工作区状态
│   └── types.ts
├── ui/
│   ├── EmptyStateWorkspace.tsx # 空状态
│   ├── RecentWorkspacesMenu.tsx
│   └── WorkspaceRootHeader.tsx
└── hooks/
    ├── useWorkspaceActions.ts  # 工作区操作 hooks
    └── useRecentItems.ts       # 最近项目 hooks
```

**职责**：
- 工作区文件夹管理
- 工作区文件（.writer-workspace）读写
- 最近项目管理
- 工作区锁（多实例互斥）

---

### 4.4 Settings 领域

```
src/domains/settings/
├── index.ts                    # 领域导出入口
├── state/
│   ├── settingsStore.ts        # 设置状态
│   └── types.ts
└── ui/
    └── SettingsPanel.tsx       # 设置面板
```

**职责**：
- 用户偏好设置
- 主题、语言、打字机模式等开关

---

## 五、后端模块设计

### 5.1 fs.rs（重构）

保留的函数：
- `list_tree` - 递归列出目录树
- `read_file` - 读取文件
- `write_file_atomic` - 原子写入
- `create_file` / `create_dir` - 创建文件/目录
- `rename_node` / `delete_node` - 重命名/删除
- `reveal_in_file_manager` - 在文件管理器中显示
- `save_image` - 保存图片
- `check_exists` - 检查路径存在
- `get_path_kind` - 获取路径类型
- `detect_file_encoding` - 检测文件编码

移除的函数：
- ❌ `get_git_sync_status`
- ❌ `run_git`（内部函数）

移除的类型：
- ❌ `GitSyncStatus`

---

### 5.2 workspace.rs（新建）

迁移的函数：
- `parse_workspace_file` - 解析工作区文件
- `save_workspace_file` - 保存工作区文件
- `resolve_relative_path` - 解析相对路径
- `list_tree_batch` - 批量加载目录树
- `check_workspace_lock` - 检查工作区锁
- `acquire_workspace_lock` - 获取工作区锁
- `release_workspace_lock` - 释放工作区锁
- `force_release_workspace_lock` - 强制释放锁

迁移的类型：
- `WorkspaceConfig`
- `WorkspaceFolderConfig`
- `WorkspaceStateConfig`
- `WorkspaceLockInfo`
- `WorkspaceLockStatus`
- `FolderPathResult`

---

### 5.3 config.rs（新建）

迁移的函数：
- `get_app_config_dir` - 获取应用配置目录
- `read_json_file` - 读取 JSON 文件
- `write_json_file` - 写入 JSON 文件

---

## 六、跨领域通信

### 6.1 通信原则

1. **领域内**：直接调用 store/services
2. **跨领域**：通过事件总线或 actions 层
3. **避免**：跨领域直接访问 store

### 6.2 保留的 Actions 层

```
src/state/actions/
├── index.ts
└── workspaceActions.ts   # 协调跨领域操作
```

`workspaceActions.ts` 负责协调 file、workspace、editor 三个领域的交互操作。

---

## 七、Git 功能移除清单

### 后端

| 文件 | 移除内容 |
|------|----------|
| `fs.rs` | `get_git_sync_status`, `run_git`, `GitSyncStatus` |
| `FsService.ts` | `getGitSyncStatus`, `GitSyncStatus` 类型 |

### 前端

| 文件 | 移除内容 |
|------|----------|
| `StatusBar.tsx` | Git 状态显示相关代码 |
| `editorSlice.ts` | 无需修改（不包含 Git 状态） |
| `workspaceSlice.ts` | 无需修改（不包含 Git 状态） |

---

## 八、迁移路径

### Phase 1: 后端重构

1. 创建 `workspace.rs`，迁移工作区相关函数
2. 创建 `config.rs`，迁移配置相关函数
3. 移除 Git 相关代码
4. 更新 `lib.rs` 模块注册
5. 运行测试验证

### Phase 2: 前端目录重组

1. 创建 `src/domains/` 目录结构
2. 迁移 file 领域代码
3. 迁移 editor 领域代码
4. 迁移 workspace 领域代码
5. 迁移 settings 领域代码
6. 创建 `src/shared/` 目录，迁移共享代码

### Phase 3: 清理与优化

1. 更新所有导入路径
2. 移除 Git 相关前端代码
3. 删除旧目录
4. 更新测试文件路径
5. 运行全量测试

### Phase 4: 文档更新

1. 更新 `docs/全局资产/技术/前端架构.md`
2. 更新 `docs/全局资产/技术/后端架构.md`
3. 更新 `AGENTS.md`

---

## 九、预期改动量

| 类别 | 新增文件 | 修改文件 | 删除文件 |
|------|---------|---------|---------|
| 后端 | 2 | 3 | 0 |
| 前端 | ~30 | ~50 | ~20 |
| 测试 | ~10 | ~40 | ~10 |
| 文档 | 1 | 3 | 0 |

---

## 十、风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| 导入路径大量变更 | 使用 TypeScript 的自动导入重构 |
| 测试失败 | 每个阶段增量验证，保持测试通过 |
| 功能回归 | 保持 API 兼容，仅重组代码结构 |

---

## 十一、验收标准

1. ✅ 所有测试通过（除已知的快照式测试）
2. ✅ 后端无 Git 相关代码
3. ✅ 前端按领域组织，目录结构清晰
4. ✅ 每个领域有独立的 `index.ts` 导出
5. ✅ 技术文档已更新