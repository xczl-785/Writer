# command-system

## Quick Read

- **id**: `command-system`
- **name**: 命令系统
- **summary**: 通过发布-订阅模式的命令总线处理原生菜单命令，实现前后端命令解耦
- **scope**: 包括 menuCommandBus、命令注册、命令分发、创建入口路由；不包括具体的业务逻辑实现
- **entry_points**:
  - Tauri 原生菜单事件 `writer://menu-command`
  - useNativeMenuBridge 监听并分发
  - menuCommandBus.dispatch(id)
- **shared_with**: none
- **check_on_change**:
  - menuCommandBus API 不变
  - 命令注册流程不变
  - 命令 ID 清单同步
- **last_verified**: 2026-03-20

---

## Capability Summary

命令系统采用发布-订阅模式，通过 menuCommandBus 实现原生菜单命令的统一处理。Tauri 后端菜单触发事件后，useNativeMenuBridge 监听并调用 menuCommandBus.dispatch，由注册的处理器执行具体逻辑。支持 File/Edit/Format/Paragraph/View 五大类命令，部分命令（Edit/Format）需要转发到编辑器组件执行。创建类命令额外经过 createEntryCommands 路由层收敛。

---

## Entries

| Entry                   | Trigger                           | Evidence                                  | Notes                             |
| ----------------------- | --------------------------------- | ----------------------------------------- | --------------------------------- |
| Tauri 菜单事件          | 用户点击原生菜单项                | `src-tauri/src/menu.rs`                   | 后端 emit `writer://menu-command` |
| useNativeMenuBridge     | 监听 `writer://menu-command` 事件 | `src/app/useNativeMenuBridge.ts:15-24`    | 调用 menuCommandBus.dispatch      |
| menuCommandBus.register | 注册命令处理器                    | `src/ui/commands/menuCommandBus.ts:6-12`  | 返回注销函数                      |
| menuCommandBus.dispatch | 查找并执行处理器                  | `src/ui/commands/menuCommandBus.ts:15-19` | 返回 boolean                      |
| File 命令注册           | registerFileCommands              | `src/app/commands/fileCommands.ts:63-285` | 包含 save/new/open 等             |
| Edit 命令注册           | registerEditCommands              | `src/app/commands/editCommands.ts:16-67`  | 转发到编辑器                      |
| Format 命令注册         | registerFormatCommands            | `src/app/commands/formatCommands.ts`      | 转发到编辑器                      |
| Paragraph 命令注册      | registerParagraphCommands         | `src/app/commands/paragraphCommands.ts`   | 转发到编辑器                      |
| View 命令注册           | registerViewCommands              | `src/app/commands/viewCommands.ts:19-56`  | 包含 outline/sidebar/focus_mode   |

---

## Current Rules

### CR-001: menuCommandBus 使用 Map 存储处理器

handlers 使用 `Map<string, MenuCommandHandler>` 存储，key 为命令 ID，value 为处理函数。

**Evidence**: `src/ui/commands/menuCommandBus.ts:3`

---

### CR-002: register 返回注销函数

register 方法返回一个函数，调用时删除对应的处理器（仅当处理器仍为当前注册的处理器时）。

**Evidence**: `src/ui/commands/menuCommandBus.ts:8-12`

---

### CR-003: dispatch 返回 boolean

dispatch 方法返回 boolean：找到处理器返回 true 并执行，未找到返回 false。

**Evidence**: `src/ui/commands/menuCommandBus.ts:15-19`

---

### CR-004: 命令注册在 App.tsx 中进行

所有命令注册函数在 App.tsx 的 useEffect 中调用，返回清理函数在卸载时执行。

**Evidence**: `src/app/App.tsx`（参考 `src/app/commands/index.ts:6-10` 导出）

---

### CR-005: Edit/Format/Paragraph 命令转发到编辑器

Edit、Format、Paragraph 类命令通过 `writer:editor-command` 自定义事件转发到编辑器组件处理。

**Evidence**: `src/app/commands/editCommands.ts:10-14`

---

### CR-006: 创建入口命令额外路由

`menu.file.new` 和 `menu.file.new_folder` 命令通过 `createEntryCommands` 路由层收敛，处理 Sidebar 显示时机和工作区可用性检查。

**Evidence**: `src/domains/workspace/services/createEntryCommands.ts:28-32, 56-76`

---

### CR-007: 命令 ID 命名规范

命令 ID 采用 `menu.{category}.{action}` 格式，如 `menu.file.save`、`menu.edit.undo`。

**Evidence**: `src/app/commands/fileCommands.ts`、`src/app/commands/editCommands.ts` 等

---

## Impact Surface

| Area                | What to check                 | Evidence                                                                                                                                                             |
| ------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| menuCommandBus API  | register/dispatch 接口不变    | `src/ui/commands/menuCommandBus.ts`                                                                                                                                  |
| useNativeMenuBridge | 事件监听和分发逻辑不变        | `src/app/useNativeMenuBridge.ts`                                                                                                                                     |
| File 命令注册       | 所有 File 类命令正常注册      | `src/app/commands/fileCommands.ts`                                                                                                                                   |
| Edit 命令注册       | 所有 Edit 类命令正常转发      | `src/app/commands/editCommands.ts`                                                                                                                                   |
| Format 命令注册     | 所有 Format 类命令正常转发    | `src/app/commands/formatCommands.ts`                                                                                                                                 |
| Paragraph 命令注册  | 所有 Paragraph 类命令正常转发 | `src/app/commands/paragraphCommands.ts`                                                                                                                              |
| View 命令注册       | 所有 View 类命令正常注册      | `src/app/commands/viewCommands.ts`                                                                                                                                   |
| 创建入口路由        | createEntryCommands 路由正确  | `src/domains/workspace/services/createEntryCommands.ts`                                                                                                              |
| 测试覆盖            | 相关测试通过                  | `src/app/commands/fileCommandsNewBehavior.test.ts`、`src/app/commands/FileCommandsWorkspaceSaveBehavior.test.ts`、`src/app/commands/FileMenuReshapeBehavior.test.ts` |

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

| Consumer            | Usage                     | Evidence                                |
| ------------------- | ------------------------- | --------------------------------------- |
| fileCommands        | 注册 File 菜单命令        | `src/app/commands/fileCommands.ts`      |
| editCommands        | 注册 Edit 菜单命令        | `src/app/commands/editCommands.ts`      |
| formatCommands      | 注册 Format 菜单命令      | `src/app/commands/formatCommands.ts`    |
| paragraphCommands   | 注册 Paragraph 菜单命令   | `src/app/commands/paragraphCommands.ts` |
| viewCommands        | 注册 View 菜单命令        | `src/app/commands/viewCommands.ts`      |
| useNativeMenuBridge | 监听 Tauri 菜单事件并分发 | `src/app/useNativeMenuBridge.ts`        |

---

## Archive Pointer

- None. This is a first-version capability document.
