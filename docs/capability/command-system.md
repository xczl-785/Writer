# command-system

## Quick Read

- **id**: `command-system`
- **name**: 命令系统
- **summary**: 通过 `@writer/core` 发布-订阅命令总线处理 Writer 原生菜单命令；QuickWrite 独立仓通过同一 Core package 消费命令总线
- **scope**: 包括 Writer menuCommandBus 消费、命令注册、命令分发、创建入口路由和 native menu bridge；QuickWrite 菜单适配和 native bridge 已迁出到 QuickWrite 仓；不包括具体的业务逻辑实现
- **entry_points**:
  - Tauri 原生菜单事件 `writer://menu-command`
  - useNativeMenuBridge 监听并分发
  - Core package `@writer/core/command`
  - 旧入口 `src/ui/commands/menuCommandBus.ts` re-export
- **shared_with**: none
- **check_on_change**:
  - core menuCommandBus API 不变
  - 旧 UI re-export 兼容入口不变
  - 命令注册流程不变
  - 命令 ID 清单同步
- **last_verified**: 2026-03-20

---

## Capability Summary

命令系统采用发布-订阅模式，通过 `@writer/core` 的 menuCommandBus 实现原生菜单命令的统一处理。Tauri 后端菜单触发事件后，useNativeMenuBridge 监听并调用 menuCommandBus.dispatch，由注册的处理器执行具体逻辑。旧 `src/ui/commands/menuCommandBus.ts` 保留 re-export 兼容入口。

QuickWrite 不再位于 Writer 仓。QuickWrite 的菜单适配、native bridge 和 Tauri 菜单配置现在由 `/Users/zhengpanpan/Program/Writer/QuickWrite` 维护，并通过 `@writer/core` 消费同一 command bus primitive。Writer 仓不得恢复 `src/apps/quick-write/**` 或 QuickWrite native menu bridge。

---

## Entries

| Entry                         | Trigger                           | Evidence                                         | Notes                             |
| ----------------------------- | --------------------------------- | ------------------------------------------------ | --------------------------------- |
| Tauri 菜单事件                | 用户点击原生菜单项                | `src-tauri/src/menu.rs`                          | 后端 emit `writer://menu-command` |
| useNativeMenuBridge           | 监听 `writer://menu-command` 事件 | `src/app/useNativeMenuBridge.ts:15-24`           | 调用 menuCommandBus.dispatch      |
| menuCommandBus.register       | 注册命令处理器                    | `@writer/core/command`                           | 旧 UI 路径 re-export 兼容         |
| menuCommandBus.dispatch       | 查找并执行处理器                  | `@writer/core/command`                           | 返回 boolean                      |
| File 命令注册                 | registerFileCommands              | `src/app/commands/fileCommands.ts:63-285`        | 包含 save/new/open 等             |
| Edit 命令注册                 | registerEditCommands              | `src/app/commands/editCommands.ts:16-67`         | 转发到编辑器                      |
| Format 命令注册               | registerFormatCommands            | `src/app/commands/formatCommands.ts`             | 转发到编辑器                      |
| Paragraph 命令注册            | registerParagraphCommands         | `src/app/commands/paragraphCommands.ts`          | 转发到编辑器                      |
| View 命令注册                 | registerViewCommands              | `src/app/commands/viewCommands.ts:19-56`         | 包含 outline/sidebar/focus_mode   |
| QuickWrite 命令注册           | QuickWriteMenuAdapter             | `QuickWrite/src/apps/quick-write/QuickWriteMenuAdapter.tsx` | QuickWrite 仓维护，过滤 workspace/sidebar 命令 |

---

## Current Rules

### CR-001: menuCommandBus 使用 Map 存储处理器

handlers 使用 `Map<string, MenuCommandHandler>` 存储，key 为命令 ID，value 为处理函数。

**Evidence**: `/Users/zhengpanpan/Program/Writer/Write-core/src/core/command/menuCommandBus.ts`

---

### CR-002: register 返回注销函数

register 方法返回一个函数，调用时删除对应的处理器（仅当处理器仍为当前注册的处理器时）。

**Evidence**: `/Users/zhengpanpan/Program/Writer/Write-core/src/core/command/menuCommandBus.ts`

---

### CR-003: dispatch 返回 boolean

dispatch 方法返回 boolean：找到处理器返回 true 并执行，未找到返回 false。

**Evidence**: `/Users/zhengpanpan/Program/Writer/Write-core/src/core/command/menuCommandBus.ts`

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

### CR-008: QuickWrite native IDs 属于 QuickWrite 仓

QuickWrite 原生菜单可以使用 `menu.quick_write.*` native IDs，但该映射属于 QuickWrite 仓。Writer 仓只维护 Writer menu schema、Writer native menu 和 Core command bus 消费，不再保存 QuickWrite native bridge 或 QuickWrite 专属 Tauri 菜单测试。

**Evidence**: `/Users/zhengpanpan/Program/Writer/QuickWrite/src/apps/quick-write/quickWriteNativeMenu.ts`、`/Users/zhengpanpan/Program/Writer/QuickWrite/src/apps/quick-write/QuickWriteMenuAdapter.tsx`、`/Users/zhengpanpan/Program/Writer/QuickWrite/src-tauri/src/menu.rs`

---

## Impact Surface

| Area                     | What to check                                                  | Evidence                                                                                                                                                             |
| ------------------------ | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| menuCommandBus API       | register/dispatch 接口不变                                     | `@writer/core/command`、`src/ui/commands/menuCommandBus.ts` re-export                                                                                                |
| useNativeMenuBridge      | 事件监听和分发逻辑不变                                         | `src/app/useNativeMenuBridge.ts`                                                                                                                                     |
| QuickWrite native bridge | `menu.quick_write.*` 映射到 schema IDs 后通过 command bus 分发 | QuickWrite 仓：`src/apps/quick-write/quickWriteNativeMenu.ts`、`src/apps/quick-write/QuickWriteMenuAdapter.tsx`                                                       |
| File 命令注册            | 所有 File 类命令正常注册                                       | `src/app/commands/fileCommands.ts`                                                                                                                                   |
| Edit 命令注册            | 所有 Edit 类命令正常转发                                       | `src/app/commands/editCommands.ts`                                                                                                                                   |
| Format 命令注册          | 所有 Format 类命令正常转发                                     | `src/app/commands/formatCommands.ts`                                                                                                                                 |
| Paragraph 命令注册       | 所有 Paragraph 类命令正常转发                                  | `src/app/commands/paragraphCommands.ts`                                                                                                                              |
| View 命令注册            | 所有 View 类命令正常注册                                       | `src/app/commands/viewCommands.ts`                                                                                                                                   |
| 创建入口路由             | createEntryCommands 路由正确                                   | `src/domains/workspace/services/createEntryCommands.ts`                                                                                                              |
| 测试覆盖                 | 相关测试通过                                                   | `src/app/commands/fileCommandsNewBehavior.test.ts`、`src/app/commands/FileCommandsWorkspaceSaveBehavior.test.ts`、`src/app/commands/FileMenuReshapeBehavior.test.ts` |

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

| Consumer                      | Usage                                | Evidence                                       |
| ----------------------------- | ------------------------------------ | ---------------------------------------------- |
| fileCommands                  | 注册 File 菜单命令                   | `src/app/commands/fileCommands.ts`             |
| editCommands                  | 注册 Edit 菜单命令                   | `src/app/commands/editCommands.ts`             |
| formatCommands                | 注册 Format 菜单命令                 | `src/app/commands/formatCommands.ts`           |
| paragraphCommands             | 注册 Paragraph 菜单命令              | `src/app/commands/paragraphCommands.ts`        |
| viewCommands                  | 注册 View 菜单命令                   | `src/app/commands/viewCommands.ts`             |
| useNativeMenuBridge           | 监听 Tauri 菜单事件并分发            | `src/app/useNativeMenuBridge.ts`               |
| QuickWrite native/menu adapter | QuickWrite 仓监听 Tauri 菜单事件并分发 | `QuickWrite/src/apps/quick-write/quickWriteNativeMenu.ts` |

---

## Archive Pointer

- None. This is a first-version capability document.
