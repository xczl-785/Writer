# autosave

## Quick Read

- **id**: `autosave`
- **name**: 自动保存
- **summary**: Writer adapter 通过 core `SaveScheduler` 防抖保存编辑器内容，并保留原 `AutosaveService` 外观 API
- **scope**: 包括自动保存调度、pending 队列、手动 flush/cancel/flushAll、保存状态与 Level 1 错误通知映射；不包括 Save As、recovery draft manager、LCU 清理、随手写 App、独立包、SingleDocumentSession 生产接入
- **entry_points**:
  - `AutosaveService.schedule`
  - `AutosaveService.flush`
  - `AutosaveService.cancel`
  - `AutosaveService.flushAll`
  - `AutosaveService.isPending`
  - `SaveScheduler`
- **shared_with**:
  - `save-core`
- **check_on_change**:
  - `AutosaveService` Writer-facing API 不变
  - `SaveScheduler` throw-based persistence port 与 Writer adapter 映射保持一致
  - status/editor/notification/ErrorService 仍留在 Writer adapter，不下沉到 core
  - pending autosave 与 Cmd+S、切文件、关闭窗口、dirty close workspace 场景需要 QA
- **last_verified**: 2026-07-03

---

## Capability Summary

自动保存当前由 `src/core/autosave/SaveScheduler.ts` 提供纯调度核心，Writer 侧 `AutosaveService` 作为 adapter 维持既有 API，并把保存结果映射到 FsService、status/editor store、notification store 和 ErrorService。

V2 第一轮已完成 autosave scheduler core 拆分，但生产保存仍通过 Writer adapter 调用 `FsService.writeFileAtomic`。`src/core/save/*` 是 future result-returning save-core port/types，不是当前生产 autosave 的已接入端口。

---

## Entries

| Entry                       | Trigger            | Evidence                                       | Notes                                                 |
| --------------------------- | ------------------ | ---------------------------------------------- | ----------------------------------------------------- |
| `AutosaveService.schedule`  | 编辑器内容变更     | `src/domains/file/services/AutosaveService.ts` | 保持 Writer-facing API，委托 `SaveScheduler.schedule` |
| `AutosaveService.flush`     | 防抖超时或手动触发 | `src/domains/file/services/AutosaveService.ts` | 保持 Promise rejection 行为，委托 scheduler           |
| `AutosaveService.cancel`    | 取消待保存         | `src/domains/file/services/AutosaveService.ts` | 委托 scheduler 清除 pending timer                     |
| `AutosaveService.flushAll`  | 批量保存           | `src/domains/file/services/AutosaveService.ts` | 委托 scheduler flush 所有 pending path                |
| `AutosaveService.isPending` | 查询待保存状态     | `src/domains/file/services/AutosaveService.ts` | App/FileCommands 用于保存前检查                       |
| `SaveScheduler`             | adapter 内部实例   | `src/core/autosave/SaveScheduler.ts`           | core 防抖、pending、retry 调度核心                    |
| compatibility re-export     | 历史导入路径       | `src/services/autosave/AutosaveService.ts`     | re-export Writer adapter                              |

---

## Current Rules

### CR-001: `AutosaveService` 外观 API 不变

Writer 调用方仍通过 `AutosaveService.schedule/flush/cancel/flushAll/isPending` 进入自动保存能力。V2 第一轮只把调度核心拆到 `SaveScheduler`，没有要求调用方改用 core。

**Evidence**: `src/domains/file/services/AutosaveService.ts`、`src/services/autosave/AutosaveService.ts`

---

### CR-002: `SaveScheduler` 负责防抖、pending 队列、flush 和 retry

`SaveScheduler` 持有 `Map<string, PendingSave>`，重复 schedule 会清除旧 timer 并保存最新内容；flush 会清除 pending 并执行保存；失败时向 `onSaveFailed` 暴露 retry，retry 重新保存失败时的内容。

**Evidence**: `src/core/autosave/SaveScheduler.ts`、`src/core/autosave/SaveScheduler.test.ts`

---

### CR-003: 当前生产 autosave persistence port 仍是 throw-based

`SaveSchedulerPorts.save` 返回 `Promise<void>`，失败通过 throw/reject 表达。`AutosaveService` adapter 把该端口映射到 `FsService.writeFileAtomic(path, content)`。不要把它描述为已经接入 `src/core/save/SavePort` 的 result-returning 端口。

**Evidence**: `src/core/autosave/SaveScheduler.ts`、`src/domains/file/services/AutosaveService.ts`、`src/core/save/savePort.ts`

---

### CR-004: status/editor/notification/ErrorService 留在 Writer adapter

core `SaveScheduler` 不依赖 Writer store 或 UI 服务。`AutosaveService` adapter 在 `onScheduled/onSaveStarted/onSaveSucceeded/onSaveFailed` 中维护 dirty/saving/saved/failed 状态、editor dirty 标记、Level 1 notification 和 ErrorService retry action。

**Evidence**: `src/domains/file/services/AutosaveService.ts`、`src/state/slices/statusSlice.ts`、`src/state/slices/notificationSlice.ts`、`src/services/error/ErrorService.ts`

---

### CR-005: 防抖延迟仍来自 Writer 配置

`AutosaveService` 用 `EDITOR_CONFIG.autosave.debounceMs` 构造 scheduler；当前默认值由 `src/config/editor.ts` 维护。

**Evidence**: `src/domains/file/services/AutosaveService.ts`、`src/config/editor.ts`

---

### CR-006: 保存失败保持 Level 1 可重试通知

保存失败时，adapter 调用 `ErrorService.handleWithInfo`，使用 `level: 'level1'`、`source: 'autosave'`、`dedupeKey: autosave:<path>` 和 Retry action。后续保存成功会 dismiss `autosave` Level 1 notification。

**Evidence**: `src/domains/file/services/AutosaveService.ts`、`src/domains/file/services/AutosaveService.notification.test.ts`

---

### CR-007: V2 第一轮没有完成生产会话接入

`src/core/session/*` 只提供 single document session reducer/types/test。当前生产 autosave、workspaceStore、Sidebar/FileTree、RecentItems、StatusBar 没有下沉到该 core session，也没有完成随手写 App 接入。

**Evidence**: `src/core/session/singleDocumentSession.ts`、`src/core/session/singleDocumentSession.test.ts`、`src/domains/editor/core/EditorCoreBoundary.test.ts`

---

## Impact Surface

| Area                       | What to check                                                                                         | Evidence                                                                                              |
| -------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Writer-facing autosave API | `schedule/flush/cancel/flushAll/isPending` 调用方不需要迁移                                           | `src/domains/file/services/AutosaveService.ts`、`src/app/commands/fileCommands.ts`、`src/app/App.tsx` |
| Core scheduler             | 防抖、flush no-op、flushAll、失败 retry、pending 清理语义不回退                                       | `src/core/autosave/SaveScheduler.test.ts`                                                             |
| Adapter mapping            | `FsService.writeFileAtomic`、status store、editor dirty、notification、ErrorService 仍由 adapter 负责 | `src/domains/file/services/AutosaveService.ts`                                                        |
| Manual save overlap        | pending autosave + Cmd+S 不应丢内容或重复产生错误状态                                                 | `src/app/commands/fileCommands.ts`                                                                    |
| Navigation/close overlap   | pending autosave + 切文件/关闭窗口、dirty close workspace 需要 QA                                     | `src/app/App.tsx`、`src/domains/workspace/services/WorkspaceManager.ts`                               |
| Save-core boundary         | 不把 `src/core/save/*` 写成当前生产 autosave 端口                                                     | `src/core/save/savePort.ts`                                                                           |

---

## Shared Rules Dependency

| Shared Rule | Dependency                                                                                                   | Lifted |
| ----------- | ------------------------------------------------------------------------------------------------------------ | ------ |
| `save-core` | Autosave 需要与 future result-returning save-core port/types 保持边界清楚，但当前生产 adapter 尚未接入该端口 | no     |

---

## Uncertainties

- pending autosave 与 Cmd+S、切文件、关闭窗口、dirty close workspace 的组合场景仍需要 V3 QA。
- `src/core/save/*` 未来接入 Writer adapter 时，需要定义 throw-based scheduler port 与 result-returning SavePort 的映射策略。

---

## Known Consumers

| Consumer                 | Usage                                             | Evidence                                                  |
| ------------------------ | ------------------------------------------------- | --------------------------------------------------------- |
| `persistenceBridge`      | 编辑器更新时 schedule，失焦时 flush               | `src/domains/editor/integration/persistenceBridge.ts`     |
| `fileCommands`           | Cmd+S/保存命令前检查 pending autosave 并 flush    | `src/app/commands/fileCommands.ts`                        |
| `App`                    | 关闭/切换相关路径中检查 pending autosave 并 flush | `src/app/App.tsx`                                         |
| `FsSafety`               | workspace/file safety 检查中 flush dirty 文件     | `src/domains/file/services/FsSafety.ts`                   |
| `WorkspaceManager` tests | 工作区切换/关闭路径验证 autosave flush            | `src/domains/workspace/services/WorkspaceManager.test.ts` |

---

## Archive Pointer

- None. Active doc normalized from earlier autosave current-truth notes on 2026-07-03.
