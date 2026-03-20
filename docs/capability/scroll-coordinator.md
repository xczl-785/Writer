# scroll-coordinator

## Quick Read

- **id**: `scroll-coordinator`
- **name**: 滚动协调器
- **summary**: 统一管理编辑器滚动事件，为多个滚动源提供协调入口
- **scope**: 包括滚动请求处理、容器信息获取、滚动工具函数；不包括具体的滚动触发逻辑
- **entry_points**:
  - ScrollCoordinator.requestScroll
  - scrollUtils 工具函数
- **shared_with**: none
- **check_on_change**:
  - ScrollCoordinator API 不变
  - 滚动边界约束正确
  - 工具函数行为不变
- **last_verified**: 2026-03-20

---

## Capability Summary

滚动协调器为编辑器中的多个滚动源（打字机模式、大纲导航、斜杠菜单、查找替换）提供统一的滚动管理入口。ScrollCoordinator 通过 requestScroll 处理滚动请求，约束 scrollTop 边界，返回处理结果。scrollUtils 提供查找滚动容器、获取容器信息、设置滚动位置、判断是否跳过滚动等工具函数。

---

## Entries

| Entry                               | Trigger          | Evidence                                                      | Notes                     |
| ----------------------------------- | ---------------- | ------------------------------------------------------------- | ------------------------- |
| createScrollCoordinator             | 创建协调器实例   | `src/domains/editor/domain/scroll/scrollCoordinator.ts:24`    | 工厂函数                  |
| ScrollCoordinator.requestScroll     | 处理滚动请求     | `src/domains/editor/domain/scroll/scrollCoordinator.ts:28-54` | 约束边界                  |
| ScrollCoordinator.getCurrentRequest | 获取当前请求     | `src/domains/editor/domain/scroll/scrollCoordinator.ts:56-58` | 查询接口                  |
| ScrollCoordinator.reset             | 重置状态         | `src/domains/editor/domain/scroll/scrollCoordinator.ts:60-62` | 清空当前请求              |
| findScrollContainer                 | 查找滚动容器     | `src/domains/editor/domain/scroll/scrollUtils.ts:21-25`       | 查找 .editor-content-area |
| getScrollContainerInfo              | 获取容器信息     | `src/domains/editor/domain/scroll/scrollUtils.ts:27-38`       | 包含 offsetTop            |
| setScrollTop                        | 设置滚动位置     | `src/domains/editor/domain/scroll/scrollUtils.ts:40-45`       | 直接设置                  |
| shouldSkipScrollAdjustment          | 判断是否跳过滚动 | `src/domains/editor/domain/scroll/scrollUtils.ts:47-53`       | 最小差值 6px              |
| resolveEditorContentTopOffset       | 解析顶部偏移     | `src/domains/editor/domain/scroll/scrollUtils.ts:10-19`       | CSS 变量                  |

---

## Current Rules

### CR-001: requestScroll 约束 scrollTop 边界

requestScroll 将 targetScrollTop 约束在 [0, scrollHeight - clientHeight] 范围内。

**Evidence**: `src/domains/editor/domain/scroll/scrollCoordinator.ts:35-41`

---

### CR-002: requestScroll 返回 handled 状态

如果 targetScrollTop 已定义，返回 `handled: true`；否则返回 `handled: false`。

**Evidence**: `src/domains/editor/domain/scroll/scrollCoordinator.ts:42-53`

---

### CR-003: ScrollSource 四种来源

ScrollSource 包括 `typewriter`、`outline-navigation`、`slash-menu`、`find-replace`。

**Evidence**: `src/domains/editor/domain/scroll/scrollTypes.ts:8-12`

---

### CR-004: findScrollContainer 查找 .editor-content-area

findScrollContainer 使用 closest 查找最近的 `.editor-content-area` 元素。

**Evidence**: `src/domains/editor/domain/scroll/scrollUtils.ts:21-25`

---

### CR-005: shouldSkipScrollAdjustment 默认阈值 6px

当目标位置与当前位置差值小于 6px 时，跳过滚动调整。

**Evidence**: `src/domains/editor/domain/scroll/scrollUtils.ts:47-53`

---

### CR-006: resolveEditorContentTopOffset 解析 CSS 变量

resolveEditorContentTopOffset 解析 `--editor-content-offset-top` CSS 变量，无效值返回 0。

**Evidence**: `src/domains/editor/domain/scroll/scrollUtils.ts:10-19`

---

## Impact Surface

| Area                  | What to check                              | Evidence                                                                                                             |
| --------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| ScrollCoordinator API | requestScroll/getCurrentRequest/reset 不变 | `src/domains/editor/domain/scroll/scrollCoordinator.ts`                                                              |
| 滚动边界约束          | scrollTop 边界计算正确                     | `src/domains/editor/domain/scroll/scrollCoordinator.ts:35-41`                                                        |
| scrollUtils           | 工具函数行为不变                           | `src/domains/editor/domain/scroll/scrollUtils.ts`                                                                    |
| ScrollSource 类型     | 四种来源类型正确                           | `src/domains/editor/domain/scroll/scrollTypes.ts`                                                                    |
| 打字机模式联动        | typewriter 滚动源正确                      | `src/domains/editor/hooks/useTypewriterAnchor.ts`                                                                    |
| 大纲导航联动          | outline-navigation 滚动源正确              | `src/ui/components/Outline/useOutlineExtractor.ts`                                                                   |
| 查找替换联动          | find-replace 滚动源正确                    | `src/domains/editor/hooks/useFindReplace.ts`                                                                         |
| 测试覆盖              | 相关测试通过                               | `src/domains/editor/domain/scroll/scrollCoordinator.test.ts`、`src/domains/editor/domain/scroll/scrollUtils.test.ts` |

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

| Consumer            | Usage            | Evidence                                           |
| ------------------- | ---------------- | -------------------------------------------------- |
| useTypewriterAnchor | 打字机模式滚动   | `src/domains/editor/hooks/useTypewriterAnchor.ts`  |
| useOutlineExtractor | 大纲导航滚动     | `src/ui/components/Outline/useOutlineExtractor.ts` |
| useFindReplace      | 查找替换导航滚动 | `src/domains/editor/hooks/useFindReplace.ts`       |
| useSlashMenu        | 斜杠菜单滚动     | `src/domains/editor/ui/menus/useSlashMenu.ts`      |

---

## Archive Pointer

- None. This is a first-version capability document.
