# save-core

## Quick Read

- **id**: `save-core`
- **name**: Save Core
- **summary**: 定义 future result-returning save port/types 和纯保存状态 reducer
- **scope**: 包括 `SavePort`、`SaveInput`/`SaveResult`、保存状态事件与 reducer；不包括当前生产 autosave adapter 接入、Save As、recovery draft manager、LCU 清理、随手写 App、独立包
- **entry_points**:
  - `src/core/save/savePort.ts`
  - `src/core/save/saveTypes.ts`
  - `src/core/save/saveWorkflow.ts`
- **shared_with**:
  - `autosave`
  - `file-system`
- **check_on_change**:
  - `SavePort` 保持 result-returning 语义
  - 不把当前 `AutosaveService` 描述成已经接入 `SavePort`
  - 与 throw-based `SaveScheduler` persistence port 的映射必须显式处理
- **last_verified**: 2026-07-03

---

## Capability Summary

Save Core 当前是 V2 第一轮新增的 core 层保存类型和纯工作流。它为后续保存能力提供 result-returning port/types，并用 reducer 描述保存状态流转。

当前生产 autosave 还没有接入 `SavePort`。生产路径仍是 `AutosaveService` adapter 构造 `SaveScheduler`，并通过 throw-based `SaveSchedulerPorts.save` 调用 `FsService.writeFileAtomic`。

---

## Entries

| Entry                  | Trigger                          | Evidence                        | Notes                                                 |
| ---------------------- | -------------------------------- | ------------------------------- | ----------------------------------------------------- |
| `SavePort.save`        | future adapter/provider 实现保存 | `src/core/save/savePort.ts`     | 返回 `Promise<SaveResult>`，不是 throw-based contract |
| save result types      | 保存结果建模                     | `src/core/save/saveTypes.ts`    | `SaveSuccess`/`SaveFailure` 都带 target 和时间戳      |
| `reduceSaveStatus`     | 保存生命周期状态归约             | `src/core/save/saveWorkflow.ts` | 纯函数，不触发文件写入或 UI 更新                      |
| `isTerminalSaveStatus` | 判断 saved/failed 终态           | `src/core/save/saveWorkflow.ts` | 供未来状态编排复用                                    |

---

## Current Rules

### CR-001: `SavePort` 是 result-returning future port

`SavePort.save(input)` 返回 `Promise<SaveResult>`，成功和失败都通过 `ok` union 表达。它不是当前 `SaveScheduler` 的 persistence port，也不等同于 `FsService.writeFileAtomic` 的 throw/reject 行为。

**Evidence**: `src/core/save/savePort.ts`、`src/core/save/saveTypes.ts`

---

### CR-002: 保存状态 reducer 是纯工作流

`reduceSaveStatus` 只根据 `scheduled/started/succeeded/failed/cancelled` 事件返回新状态，不写文件、不改 store、不发通知。`cancelled` 只把 `dirty` 回到 `idle`，不会取消正在 saving 的状态。

**Evidence**: `src/core/save/saveWorkflow.ts`、`src/core/save/saveWorkflow.test.ts`

---

### CR-003: 当前生产保存仍经 Writer adapters

当前 autosave 生产路径仍由 `AutosaveService` adapter 调 `FsService.writeFileAtomic`，并在 adapter 内处理 status/editor/notification/ErrorService。不要声称 workspaceStore、Sidebar/FileTree、RecentItems、StatusBar 或生产 autosave 已经下沉到 save-core。

**Evidence**: `src/domains/file/services/AutosaveService.ts`、`src/domains/file/services/FsService.ts`、`src/core/save/savePort.ts`

---

### CR-004: save-core 与 file-system 的关系是端口到 adapter 的未来边界

`save-core` 定义保存端口和状态语义；`FsService` 当前仍是 Writer-facing 文件系统 adapter。未来若接入 `SavePort`，应由 adapter/provider 显式把 `FsService.writeFileAtomic` 的 throw/reject 结果映射为 `SaveResult`。

**Evidence**: `src/core/save/savePort.ts`、`src/domains/file/services/FsService.ts`

---

## Impact Surface

| Area             | What to check                                                              | Evidence                                                                             |
| ---------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Port contract    | `SavePort.save` 继续返回 `SaveResult`，不要改成 throw-only API             | `src/core/save/savePort.ts`                                                          |
| Status workflow  | reducer 覆盖 scheduled/started/succeeded/failed/cancelled 生命周期         | `src/core/save/saveWorkflow.test.ts`                                                 |
| Autosave adapter | 未接入前，autosave 文档和代码仍描述 throw-based scheduler port             | `src/domains/file/services/AutosaveService.ts`、`src/core/autosave/SaveScheduler.ts` |
| FsService bridge | 未来接入时需要显式处理 `writeFileAtomic` exception 到 `SaveFailure` 的映射 | `src/domains/file/services/FsService.ts`                                             |

---

## Shared Rules Dependency

| Shared Rule   | Dependency                                                                                                           | Lifted |
| ------------- | -------------------------------------------------------------------------------------------------------------------- | ------ |
| `autosave`    | Production autosave still uses throw-based `SaveScheduler` persistence and references save-core as a future boundary | no     |
| `file-system` | Future `SavePort` providers may map `FsService.writeFileAtomic` throw/reject behavior into `SaveResult`              | no     |

---

## Uncertainties

- `SavePort` 尚未接入生产 adapter，具体 provider 命名、错误分类和 telemetry 边界留待后续设计。
- Save As、recovery draft manager、LCU 清理不在当前 save-core 已完成范围内。

---

## Known Consumers

| Consumer                 | Usage                              | Evidence                             |
| ------------------------ | ---------------------------------- | ------------------------------------ |
| `src/core/save/index.ts` | re-export save-core public surface | `src/core/save/index.ts`             |
| `saveWorkflow.test`      | 验证 reducer 当前语义              | `src/core/save/saveWorkflow.test.ts` |

---

## Archive Pointer

- None. This is the first capability document for V2 save-core.
