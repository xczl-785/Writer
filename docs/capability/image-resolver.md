# image-resolver

## Quick Read

- **id**: `image-resolver`
- **name**: 图片路径解析
- **summary**: 解析图片相对/绝对路径为 Tauri asset URL，支持多种路径格式
- **scope**: 包括路径解析、路径拼接、asset URL 转换；不包括图片上传、图片保存
- **entry_points**:
  - ImageResolver.resolve
  - ImageResolver.join
- **shared_with**: none
- **check_on_change**:
  - ImageResolver API 不变
  - 路径解析逻辑正确
  - asset URL 转换正确
- **last_verified**: 2026-03-20

---

## Capability Summary

图片路径解析能力将图片 src 属性解析为可加载的 URL。支持绝对路径（/path 或 C:\path）通过 convertFileSrc 转换为 asset URL，相对路径基于当前文件路径解析为绝对路径后转换。http://、https://、data:、blob:、asset:// 等协议直接返回。提供 join 方法用于路径拼接。

---

## Entries

| Entry                 | Trigger      | Evidence                                     | Notes        |
| --------------------- | ------------ | -------------------------------------------- | ------------ |
| ImageResolver.resolve | 解析图片路径 | `src/services/images/ImageResolver.ts:6-42`  | 主要入口     |
| ImageResolver.join    | 拼接路径     | `src/services/images/ImageResolver.ts:44-58` | 处理 .. 和 . |

---

## Current Rules

### CR-001: 已知协议直接返回

http://、https://、data:、blob:、asset:// 开头的路径直接返回，不做处理。

**Evidence**: `src/services/images/ImageResolver.ts:9-17`

---

### CR-002: 绝对路径通过 convertFileSrc 转换

/ 开头或 Windows 盘符路径（C:\）通过 convertFileSrc 转换为 asset URL。

**Evidence**: `src/services/images/ImageResolver.ts:19-26`

---

### CR-003: 相对路径基于当前文件解析

相对路径基于 activeFilePath 的父目录解析为绝对路径，然后转换为 asset URL。

**Evidence**: `src/services/images/ImageResolver.ts:28-41`

---

### CR-004: 无 activeFilePath 时返回原值

如果没有 activeFilePath，相对路径无法解析，直接返回原值。

**Evidence**: `src/services/images/ImageResolver.ts:28-30`

---

### CR-005: join 处理 .. 和 .

join 方法处理 `..`（上级目录）和 `.`（当前目录），拼接最终路径。

**Evidence**: `src/services/images/ImageResolver.ts:44-58`

---

### CR-006: 错误记录到 ErrorService

路径转换失败时，通过 ErrorService.log 记录错误，返回原值。

**Evidence**: `src/services/images/ImageResolver.ts:23-24, 39-40`

---

## Impact Surface

| Area              | What to check                              | Evidence                                    |
| ----------------- | ------------------------------------------ | ------------------------------------------- |
| ImageResolver API | resolve/join 方法不变                      | `src/services/images/ImageResolver.ts`      |
| convertFileSrc    | Tauri API 调用正确                         | `@tauri-apps/api/core`                      |
| 路径工具函数      | normalizePath/getParentPath/splitPath 正确 | `src/shared/utils/pathUtils.ts`             |
| ErrorService 联动 | 错误记录正确                               | `src/services/error/ErrorService.ts`        |
| 测试覆盖          | 相关测试通过                               | `src/services/images/ImageResolver.test.ts` |

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

| Consumer     | Usage                 | Evidence                                   |
| ------------ | --------------------- | ------------------------------------------ |
| EditorImpl   | Image 扩展的 src 解析 | `src/domains/editor/core/EditorImpl.tsx`   |
| imageActions | 图片插入时路径处理    | `src/domains/editor/hooks/imageActions.ts` |

---

## Archive Pointer

- None. This is a first-version capability document.
