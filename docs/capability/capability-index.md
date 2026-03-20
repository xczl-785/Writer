# capability-index

Discovery layer for project capabilities. For rules and impact details, read the individual capability documents.

| id                   | name         | summary                                                               | entry_points                                                          | shared_with | path                                      |
| -------------------- | ------------ | --------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------- | ----------------------------------------- |
| create-entry         | Create Entry | Create new files and folders in workspace file tree                   | menu bar, keyboard, toolbar, context menu, root header                | none        | `docs/capability/create-entry.md`         |
| command-system       | 命令系统     | 通过发布-订阅模式的命令总线处理原生菜单命令，实现前后端命令解耦       | Tauri 原生菜单事件、useNativeMenuBridge、menuCommandBus.dispatch      | none        | `docs/capability/command-system.md`       |
| file-system          | 文件系统操作 | 封装所有 Tauri 文件系统操作，提供统一的前端调用入口                   | FsService 方法调用                                                    | none        | `docs/capability/file-system.md`          |
| workspace-management | 工作区管理   | 管理工作区的打开、关闭、文件夹添加/移除、状态持久化                   | workspaceActions、WorkspaceManager 方法调用                           | none        | `docs/capability/workspace-management.md` |
| autosave             | 自动保存     | 通过防抖机制自动保存编辑器内容，支持重试和手动 flush                  | AutosaveService 方法调用                                              | none        | `docs/capability/autosave.md`             |
| find-replace         | 查找替换     | 在编辑器中查找和替换文本，支持单个替换和全部替换                      | 快捷键、useFindReplace hook                                           | none        | `docs/capability/find-replace.md`         |
| slash-menu           | 斜杠菜单     | 通过 `/` 触发的命令面板，用于快速插入块级 Markdown 元素               | 输入 `/`、useSlashMenu hook、slashReducer                             | none        | `docs/capability/slash-menu.md`           |
| scroll-coordinator   | 滚动协调器   | 统一管理编辑器滚动事件，为多个滚动源提供协调入口                      | ScrollCoordinator.requestScroll、scrollUtils 工具函数                 | none        | `docs/capability/scroll-coordinator.md`   |
| typewriter-mode      | 打字机模式   | 通过事件驱动状态机实现 Free/Locked 双态体验，锁定光标垂直位置         | reduceTypewriterState、dispatchTypewriterEvent、useTypewriterAnchor   | none        | `docs/capability/typewriter-mode.md`      |
| i18n                 | 国际化       | 轻量级自定义 i18n 方案，支持 zh-CN 和 en-US 两种语言                  | t(key)、getLocale/setLocale、initLocale                               | none        | `docs/capability/i18n.md`                 |
| error-handling       | 错误处理     | 统一错误分类、日志记录、UI 状态同步，提供结构化错误信息               | ErrorService.handle、handleWithInfo、handleAsync、handleAsyncWithInfo | none        | `docs/capability/error-handling.md`       |
| image-resolver       | 图片路径解析 | 解析图片相对/绝对路径为 Tauri asset URL，支持多种路径格式             | ImageResolver.resolve、ImageResolver.join                             | none        | `docs/capability/image-resolver.md`       |
| focus-zen            | 禅模式       | 隐藏 header 和 statusbar，提供沉浸式写作体验，支持 ESC 和鼠标唤醒退出 | useFocusZenWakeup、hasActiveOverlayInDom、EditorImpl ESC 逻辑         | none        | `docs/capability/focus-zen.md`            |
