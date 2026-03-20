# autosave

## Quick Read

- **id**: `autosave`
- **name**: 自动保存
- **summary**: 通过防抖机制自动保存编辑器内容，支持重试和手动 flush
- **scope**: 包括防抖调度、队列管理、重试机制、手动 flush；不包括文件系统操作本身
- **entry_points**:
  - AutosaveService.schedule
  - AutosaveService.flush
  - AutosaveService.flushAll
- **shared_with**: none
- **check_on_change**:
  - AutosaveService API 不变
  - 防抖延迟配置可调整
  - 重试机制正确
- **last_verified**: 2026-03-20

---

## Capability Summary

自动保存能力通过防抖机制自动调度文件保存，避免频繁的磁盘写入。每次编辑器内容变更时调用 schedule，防抖延迟后自动触发 flush 执行保存。支持手动 flush 立即保存、cancel 取消待保存、flushAll 批量保存所有待保存文件。保存失败时通过 ErrorService 显示重试按钮。

---

## Entries

| Entry                     | Trigger            | Evidence                                             | Notes          |
| ------------------------- | ------------------ | ---------------------------------------------------- | -------------- |
| AutosaveService.schedule  | 编辑器内容变更     | `src/domains/file/services/AutosaveService.ts:17-30` | 防抖调度       |
| AutosaveService.flush     | 防抖超时或手动触发 | `src/domains/file/services/AutosaveService.ts:32-80` | 执行保存       |
| AutosaveService.cancel    | 取消待保存         | `src/domains/file/services/AutosaveService.ts:82-88` | 清除定时器     |
| AutosaveService.flushAll  | 批量保存           | `src/domains/file/services/AutosaveService.ts:90-93` | 保存所有待保存 |
| AutosaveService.isPending | 检查是否有待保存   | `src/domains/file/services/AutosaveService.ts:95-97` | 返回 boolean   |

---

## Current Rules

### CR-001: 防抖延迟默认 800ms

防抖延迟通过 EDITOR_CONFIG.autosave.debounceMs 配置，默认 800ms。

**Evidence**: `src/config/editor.ts:3`、`src/domains/file/services/AutosaveService.ts:7`

---

### CR-002: 防抖机制基于 Map + setTimeout

pendingSaves 使用 Map<string, PendingSave> 存储待保存内容，每次 schedule 时清除旧定时器并设置新定时器。

**Evidence**: `src/domains/file/services/AutosaveService.ts:14, 18-21, 29`

---

### CR-003: flush 执行原子写入

flush 调用 FsService.writeFileAtomic 执行原子写入，成功后清除脏标记。

**Evidence**: `src/domains/file/services/AutosaveService.ts:45-46, 64-66`

---

### CR-004: 保存失败触发 ErrorService 重试

保存失败时通过 ErrorService.handleWithInfo 显示错误信息，并提供 Retry 按钮。

**Evidence**: `src/domains/file/services/AutosaveService.ts:48-59, 68-77`

---

### CR-005: schedule 调用时标记脏状态

schedule 调用时通过 useStatusStore.markDirty() 标记脏状态。

**Evidence**: `src/domains/file/services/AutosaveService.ts:23`

---

### CR-006: 兼容 re-export

`src/services/autosave/AutosaveService.ts` 从 `src/domains/file/services/AutosaveService.ts` re-export，保持历史导入路径兼容。

**Evidence**: `src/services/autosave/AutosaveService.ts:1`

---

## Impact Surface

| Area                      | What to check                                 | Evidence                                       |
| ------------------------- | --------------------------------------------- | ---------------------------------------------- |
| AutosaveService API       | schedule/flush/cancel/flushAll/isPending 不变 | `src/domains/file/services/AutosaveService.ts` |
| 防抖配置                  | debounceMs 可调整                             | `src/config/editor.ts:3`                       |
| FsService.writeFileAtomic | 原子写入调用正确                              | `src/domains/file/services/FsService.ts:49-51` |
| ErrorService              | 重试按钮逻辑正确                              | `src/services/error/ErrorService.ts`           |
| useStatusStore            | 脏/保存状态更新正确                           | `src/state/slices/statusSlice.ts`              |
| useEditorStore            | 脏标记清除正确                                | `src/domains/editor/state/editorStore.ts`      |
| 兼容路径                  | re-export 路径正确                            | `src/services/autosave/AutosaveService.ts`     |

---

## Shared Rules Dependency

| Shared Rule | Dependency                 | Lifted |
| ----------- | -------------------------- | ------ |
| none        | No shared rules identified | no     |

---

## Uncertainties

- None currently identified.

---

## Known Consumers

| Consumer          | Usage                    | Evidence                                              |
| ----------------- | ------------------------ | ----------------------------------------------------- |
| fileCommands      | 手动 flush 待保存内容    | `src/app/commands/fileCommands.ts`                    |
| persistenceBridge | 编辑器更新时调度自动保存 | `src/domains/editor/integration/persistenceBridge.ts` |
| FsSafety          | 冲突检测和 flush         | `src/domains/file/services/FsSafety.ts`               |

---

## Archive Pointer

- None. This is a first-version capability document.
