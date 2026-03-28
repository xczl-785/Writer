# error-handling

## Quick Read

- **id**: `error-handling`
- **name**: 错误处理
- **summary**: 统一错误分类、日志记录、UI 状态同步，提供结构化错误信息
- **scope**: 包括错误分类、错误日志、状态更新、重试机制；不包括错误恢复逻辑
- **entry_points**:
  - ErrorService.handle
  - ErrorService.handleWithInfo
  - ErrorService.handleAsync
  - ErrorService.handleAsyncWithInfo
- **shared_with**: none
- **check_on_change**:
  - ErrorService API 不变
  - 错误分类逻辑正确
  - 状态更新正确
- **last_verified**: 2026-03-20

---

## Capability Summary

错误处理能力通过 ErrorService 提供统一的错误处理入口。支持错误分类（permission/network/user/system）、日志记录、UI 状态同步。handle 方法处理简单错误，handleWithInfo 方法提供结构化错误信息（包括 reason、suggestion、action）。categorizeError 根据错误消息关键词自动分类。

---

## Entries

| Entry                            | Trigger            | Evidence                                     | Notes            |
| -------------------------------- | ------------------ | -------------------------------------------- | ---------------- |
| ErrorService.log                 | 记录错误日志       | `src/services/error/ErrorService.ts:120-122` | console.error    |
| ErrorService.handle              | 处理简单错误       | `src/services/error/ErrorService.ts:124-130` | 更新状态         |
| ErrorService.handleWithInfo      | 处理结构化错误     | `src/services/error/ErrorService.ts:135-147` | 返回 ErrorInfo   |
| ErrorService.handleAsync         | 异步错误处理       | `src/services/error/ErrorService.ts:149-159` | 返回 null        |
| ErrorService.handleAsyncWithInfo | 异步结构化错误处理 | `src/services/error/ErrorService.ts:164-176` | 返回 result/info |

---

## Current Rules

### CR-001: 四种错误分类

ErrorCategory 包括 `permission`、`network`、`user`、`system`。

**Evidence**: `src/services/error/ErrorService.ts:11, 36-66`

---

### CR-002: 错误分类基于消息关键词

categorizeError 通过检查错误消息中的关键词（permission、network、not found 等）自动分类。

**Evidence**: `src/services/error/ErrorService.ts:36-66`

---

### CR-003: handleWithInfo 返回 ErrorInfo

handleWithInfo 返回包含 category、reason、suggestion、action 的 ErrorInfo 对象。

**Evidence**: `src/services/error/ErrorService.ts:16-21, 135-147`

---

### CR-004: 状态更新通过 useStatusStore

handle 更新状态为 'error'，handleWithInfo 调用 setSaveError 设置结构化错误信息。

**Evidence**: `src/services/error/ErrorService.ts:127-130, 142-145`

---

### CR-005: 错误消息回退到 i18n

generateErrorInfo 使用 t() 函数获取本地化的错误消息和建议。

**Evidence**: `src/services/error/ErrorService.ts:84-86, 91-93, 98-99, 105-106`

---

### CR-006: action 支持重试按钮

ErrorInfo.action 包含 label 和 run 回调，可用于显示重试按钮。

**Evidence**: `src/services/error/ErrorService.ts:20-21, 115`

---

## Impact Surface

| Area             | What to check                                              | Evidence                                   |
| ---------------- | ---------------------------------------------------------- | ------------------------------------------ |
| ErrorService API | handle/handleWithInfo/handleAsync/handleAsyncWithInfo 不变 | `src/services/error/ErrorService.ts`       |
| 错误分类         | categorizeError 逻辑正确                                   | `src/services/error/ErrorService.ts:36-66` |
| 状态更新         | useStatusStore 调用正确                                    | `src/state/slices/statusSlice.ts`          |
| i18n 联动        | 错误消息翻译正确                                           | `src/shared/i18n/messages.ts`              |
| 测试覆盖         | 相关测试通过                                               | `src/services/error/ErrorService.test.ts`  |

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

| Consumer         | Usage            | Evidence                                             |
| ---------------- | ---------------- | ---------------------------------------------------- |
| AutosaveService  | 保存失败错误处理 | `src/domains/file/services/AutosaveService.ts`       |
| EditorImpl       | 编辑器错误处理   | `src/domains/editor/core/EditorImpl.tsx`             |
| WorkspaceManager | 工作区错误处理   | `src/domains/workspace/services/WorkspaceManager.ts` |
| ImageResolver    | 图片路径转换错误 | `src/services/images/ImageResolver.ts`               |

---

## Archive Pointer

- None. This is a first-version capability document.

---

## 2026-03-28 Current Truth Update

### CT-001: ErrorService now supports presentation-level routing

`ErrorService.handleWithInfo(...)` supports `level`, `source`, `dedupeKey`, and `actions`.
When `level` is `level1`, `level2`, or `level3`, the error routes into `notificationSlice`
instead of writing to `saveError`.

**Evidence**: `src/services/error/ErrorService.ts`

### CT-002: Global notification host is part of the active error path

Level 2 top toast and Level 3 editor overlay banner are rendered by `NotificationHost`.

**Evidence**: `src/ui/notifications/NotificationHost.tsx`, `src/app/App.tsx`

### CT-003: Save lane and notification lane are now separate

`statusSlice` remains the save/status lane. Global error presentation is handled by
`notificationSlice`. Level 1 is reused by save-adjacent recoverable failures.

**Evidence**: `src/state/slices/statusSlice.ts`, `src/state/slices/notificationSlice.ts`
