# find-replace

## Quick Read

- **id**: `find-replace`
- **name**: 查找替换
- **summary**: 在编辑器中查找和替换文本，支持单个替换和全部替换
- **scope**: 包括查找面板、文本匹配、导航、单个替换、全部替换；不包括正则表达式、大小写敏感选项
- **entry_points**:
  - 快捷键 Cmd/Ctrl+F（查找）
  - 快捷键 Cmd/Ctrl+H（替换）
  - useFindReplace hook
- **shared_with**: none
- **check_on_change**:
  - 快捷键绑定不变
  - 查找匹配逻辑不变
  - 替换操作正确
- **last_verified**: 2026-03-20

---

## Capability Summary

查找替换能力提供在编辑器中查找和替换文本的功能。通过 Cmd/Ctrl+F 打开查找面板，Cmd/Ctrl+H 打开替换面板。支持遍历所有匹配项、单个替换当前匹配、全部替换所有匹配。查找匹配数限制为 1000 个（FIND_MATCH_LIMIT）。导航时通过 emitTypewriterForceFree 退出打字机模式。

---

## Entries

| Entry                                  | Trigger      | Evidence                                                          | Notes          |
| -------------------------------------- | ------------ | ----------------------------------------------------------------- | -------------- |
| Cmd/Ctrl+F                             | 打开查找面板 | `src/domains/editor/extensions/findReplaceShortcuts.ts:21-24`     | 快捷键扩展     |
| Cmd/Ctrl+H                             | 打开替换面板 | `src/domains/editor/extensions/findReplaceShortcuts.ts:25-28`     | 快捷键扩展     |
| useFindReplace.openFindPanel           | 打开面板     | `src/domains/editor/hooks/useFindReplace.ts:35-38`                | 设置状态       |
| useFindReplace.closeFindPanel          | 关闭面板     | `src/domains/editor/hooks/useFindReplace.ts:40-44`                | 恢复焦点       |
| useFindReplace.goToNextFindMatch       | 下一个匹配   | `src/domains/editor/hooks/useFindReplace.ts:80-101`               | 循环导航       |
| useFindReplace.goToPrevFindMatch       | 上一个匹配   | `src/domains/editor/hooks/useFindReplace.ts:103-124`              | 循环导航       |
| useFindReplace.replaceOneActiveMatch   | 替换当前匹配 | `src/domains/editor/hooks/useFindReplace.ts:126-170`              | 替换后重新查找 |
| useFindReplace.replaceAllActiveMatches | 替换全部匹配 | `src/domains/editor/hooks/useFindReplace.ts:172-219`              | 从后往前替换   |
| collectFindTextMatches                 | 收集匹配项   | `src/domains/editor/domain/findReplace/findReplaceDomain.ts:9-36` | 纯函数         |

---

## Current Rules

### CR-001: 查找匹配数限制 1000

collectFindTextMatches 收集匹配项时，超过 FIND_MATCH_LIMIT（1000）后停止收集。

**Evidence**: `src/domains/editor/domain/findReplace/findReplaceDomain.ts:19, 24`、`src/config/editor.ts:14`

---

### CR-002: 文本匹配基于 indexOf

collectFindTextMatches 使用 indexOf 逐个查找匹配项，遍历文档所有文本节点。

**Evidence**: `src/domains/editor/domain/findReplace/findReplaceDomain.ts:18-33`

---

### CR-003: 导航时退出打字机模式

goToFindMatchIndex 调用 emitTypewriterForceFree('find-navigation') 退出打字机模式。

**Evidence**: `src/domains/editor/hooks/useFindReplace.ts:63`

---

### CR-004: 替换全部从后往前执行

replaceAllActiveMatches 从最后一个匹配开始替换，避免位置偏移影响后续替换。

**Evidence**: `src/domains/editor/hooks/useFindReplace.ts:189`

---

### CR-005: 替换单个后重新查找

replaceOneActiveMatch 替换后重新收集匹配项，并更新活动匹配索引。

**Evidence**: `src/domains/editor/hooks/useFindReplace.ts:147-161`

---

### CR-006: 导航循环

goToNextFindMatch 和 goToPrevFindMatch 支持循环导航，到达边界后继续从另一端开始。

**Evidence**: `src/domains/editor/hooks/useFindReplace.ts:89-92, 112-115`

---

### CR-007: 快捷键同时绑定 Undo/Redo

findReplaceShortcuts 扩展同时绑定 Cmd/Ctrl+Z（Undo）、Cmd/Ctrl+Y（Redo）、Cmd/Ctrl+Shift+Z（Redo）。

**Evidence**: `src/domains/editor/extensions/findReplaceShortcuts.ts:29-40`

---

## Impact Surface

| Area                | What to check                     | Evidence                                                          |
| ------------------- | --------------------------------- | ----------------------------------------------------------------- |
| 快捷键绑定          | Cmd/Ctrl+F 和 Cmd/Ctrl+H 正确触发 | `src/domains/editor/extensions/findReplaceShortcuts.ts`           |
| useFindReplace hook | 状态管理和操作逻辑正确            | `src/domains/editor/hooks/useFindReplace.ts`                      |
| findReplaceDomain   | 文本匹配逻辑正确                  | `src/domains/editor/domain/findReplace/findReplaceDomain.ts`      |
| FindReplacePanel    | UI 渲染和交互正确                 | `src/domains/editor/ui/components/FindReplacePanel.tsx`           |
| 打字机模式联动      | 导航时正确退出打字机模式          | `src/domains/editor/domain/typewriter/events.ts`                  |
| FIND_MATCH_LIMIT    | 匹配数限制配置正确                | `src/config/editor.ts:14`、`src/domains/editor/core/constants.ts` |
| 测试覆盖            | 相关测试通过                      | `src/domains/editor/core/EditorFindReplace.test.ts`               |

---

## Shared Rules Dependency

| Shared Rule | Dependency                 | Lifted |
| ----------- | -------------------------- | ------ |
| none        | No shared rules identified | no     |

---

## Uncertainties

- 当前不支持正则表达式和大小写敏感选项，是否需要后续支持待确认

---

## Known Consumers

| Consumer             | Usage            | Evidence                                                |
| -------------------- | ---------------- | ------------------------------------------------------- |
| EditorImpl           | 集成查找替换功能 | `src/domains/editor/core/EditorImpl.tsx`                |
| findReplaceShortcuts | 快捷键绑定       | `src/domains/editor/extensions/findReplaceShortcuts.ts` |
| FindReplacePanel     | UI 渲染          | `src/domains/editor/ui/components/FindReplacePanel.tsx` |

---

## Archive Pointer

- None. This is a first-version capability document.
