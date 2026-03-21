# focus-zen

## Quick Read

- **id**: `focus-zen`
- **name**: 禅模式
- **summary**: 隐藏 header 和 statusbar，提供沉浸式写作体验，支持 ESC 和鼠标唤醒退出
- **scope**: 包括 ESC 退出、双击退出、鼠标唤醒、overlay 检测、CSS 过渡动画、菜单栏展开保持唤醒；不包括打字机模式
- **entry_points**:
  - useFocusZenWakeup hook
  - hasActiveOverlayInDom 检测函数
  - EditorImpl ESC/双击退出逻辑
- **shared_with**: none
- **check_on_change**:
  - ESC 退出逻辑正确
  - 鼠标唤醒阈值可配置
  - CSS 过渡动画正确
- **last_verified**: 2026-03-21

---

## Capability Summary

禅模式提供沉浸式写作体验，通过隐藏 header 和 statusbar 减少视觉干扰。支持三种退出方式：ESC 键退出（检测 overlay 状态避免误触）、鼠标移动到顶部/底部唤醒 UI、双击退出。useFocusZenWakeup hook 监听鼠标移动并返回 isHeaderAwake/isFooterAwake 状态，配合 CSS 200ms opacity 过渡动画实现平滑显示/隐藏。当 Windows 菜单栏有展开项时（检测 `[data-menu-open]`），header 保持唤醒状态以允许用户点击下拉菜单。

---

## Entries

| Entry                           | Trigger            | Evidence                                                          | Notes                                                          |
| ------------------------------- | ------------------ | ----------------------------------------------------------------- | -------------------------------------------------------------- |
| useFocusZenWakeup               | 鼠标移动唤醒       | `src/ui/layout/useFocusZenWakeup.ts:5-37`                         | 返回 isHeaderAwake/isFooterAwake，检测 data-menu-open 保持唤醒 |
| hasActiveOverlayInDom           | 检测活跃 overlay   | `src/domains/editor/domain/focusZen/focusZenEscapeDomain.ts:4-17` | ESC 退出前检测                                                 |
| EditorImpl ESC 处理             | ESC 键退出禅模式   | `src/domains/editor/core/EditorImpl.tsx:310-320`                  | 需无 overlay                                                   |
| EditorImpl 双击处理             | 双击退出禅模式     | `src/domains/editor/core/EditorImpl.tsx`（onDoubleClick）         | 参考测试文件                                                   |
| editor-header--focus-zen-hidden | Header 隐藏样式    | `src/domains/editor/ui/components/EditorShell.tsx`                | CSS 类                                                         |
| status-bar--focus-zen-hidden    | Statusbar 隐藏样式 | `src/ui/statusbar/StatusBar.tsx`                                  | CSS 类                                                         |

---

## Current Rules

### CR-001: 鼠标唤醒阈值默认 50px

useFocusZenWakeup 默认 threshold 为 50px，鼠标移动到顶部/底部 50px 范围内唤醒对应 UI。

**Evidence**: `src/ui/layout/useFocusZenWakeup.ts:5`

---

### CR-002: isHeaderAwake/isFooterAwake 独立控制

header 和 footer 的唤醒状态独立计算，互不影响。

**Evidence**: `src/ui/layout/useFocusZenWakeup.ts:25-26`

---

### CR-003: 禁用时立即恢复可见

enabled 为 false 时，立即设置 isHeaderAwake 和 isFooterAwake 为 true。

**Evidence**: `src/ui/layout/useFocusZenWakeup.ts:14-18`

---

### CR-004: ESC 退出检测 overlay 状态

ESC 退出禅模式时，先检查 hasTransientOverlay 和 hasActiveOverlayInDom，如果有活跃 overlay 则不退出。

**Evidence**: `src/domains/editor/core/EditorImpl.tsx:314`

---

### CR-005: overlay 检测覆盖五种组件

hasActiveOverlayInDom 检测：.editor-find-panel、.editor-slash-menu、.editor-slash-inline、.context-menu、.outline-popover。

**Evidence**: `src/domains/editor/domain/focusZen/focusZenEscapeDomain.ts:1-2`

---

### CR-006: CSS 过渡动画 200ms

header 和 statusbar 的显示/隐藏使用 200ms opacity 过渡动画。

**Evidence**: `src/domains/editor/core/Editor.css:199`（.editor-header--focus-zen-hidden）、`src/ui/statusbar/StatusBar.css`（.status-bar--focus-zen-hidden）

---

### CR-007: ESC 事件使用捕获阶段

ESC 键监听使用 capture: true（第三个参数为 true），确保优先于其他处理。

**Evidence**: `src/domains/editor/core/EditorImpl.tsx:318`

---

### CR-008: 菜单栏展开时保持 header 唤醒

当检测到 DOM 中存在 `[data-menu-open]` 元素时（即 Windows 菜单栏有展开项），isHeaderAwake 始终为 true，保持 header 可见以允许用户点击下拉菜单。该属性由 `WindowsMenuBar` 在 `openGroupId !== null` 时设置。

**Evidence**: `src/ui/layout/useFocusZenWakeup.ts:27-28`、`src/ui/chrome/WindowsMenuBar.tsx:572-579`

---

### CR-009: 无文件打开时拦截进入禅模式

当用户尝试进入禅模式但没有打开任何文件时，拦截操作并通过状态栏显示错误提示 "请先打开文件再进入禅模式"。避免用户进入禅模式后界面无可操作内容导致困惑。

**Evidence**: `src/app/App.tsx:228-232`

---

## Impact Surface

| Area                  | What to check                           | Evidence                                                     |
| --------------------- | --------------------------------------- | ------------------------------------------------------------ |
| useFocusZenWakeup     | 阈值、状态逻辑、data-menu-open 检测正确 | `src/ui/layout/useFocusZenWakeup.ts`                         |
| hasActiveOverlayInDom | overlay 选择器正确                      | `src/domains/editor/domain/focusZen/focusZenEscapeDomain.ts` |
| EditorImpl ESC 逻辑   | 退出条件正确                            | `src/domains/editor/core/EditorImpl.tsx:310-320`             |
| EditorShell CSS       | focus-zen-hidden 类正确                 | `src/domains/editor/ui/components/EditorShell.tsx`           |
| Editor.css            | 过渡动画正确                            | `src/domains/editor/core/Editor.css`                         |
| StatusBar CSS         | 状态栏隐藏样式正确                      | `src/ui/statusbar/StatusBar.css`                             |
| App.tsx               | props 传递正确、无文件时拦截逻辑正确    | `src/app/App.tsx:228-236`                                    |
| WindowsMenuBar        | data-menu-open 属性正确设置             | `src/ui/chrome/WindowsMenuBar.tsx:572-579`                   |
| 测试覆盖              | 相关测试通过                            | `src/ui/layout/FocusZenBehavior.test.ts`                     |

---

## Shared Rules Dependency

| Shared Rule | Dependency                 | Lifted |
| ----------- | -------------------------- | ------ |
| none        | No shared rules identified | no     |

---

## Uncertainties

- 双击退出功能测试文件引用 onDoubleClick 但实际代码中未找到实现，可能尚未实现或已移除

---

## Known Consumers

| Consumer    | Usage                                                 | Evidence                                           |
| ----------- | ----------------------------------------------------- | -------------------------------------------------- |
| App.tsx     | 使用 useFocusZenWakeup，传递 isFocusZen/isHeaderAwake | `src/app/App.tsx`                                  |
| EditorImpl  | ESC 退出逻辑，接收 isFocusZen prop                    | `src/domains/editor/core/EditorImpl.tsx`           |
| EditorShell | 应用 focus-zen-hidden CSS 类                          | `src/domains/editor/ui/components/EditorShell.tsx` |
| StatusBar   | 应用 focus-zen-hidden CSS 类                          | `src/ui/statusbar/StatusBar.tsx`                   |

---

## Archive Pointer

- None. This is a first-version capability document.
