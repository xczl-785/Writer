# Writer V5 Zen / Typewriter / Focus Zen Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 完整落地 V5 交互方案（Zen 分层、Typewriter Toggle+Restore、Focus Zen、响应式尺寸、Slash 边界）并补齐可扩展的设置持久化基础。

**Architecture:** 先建设统一的视图状态与持久化层，再把菜单命令、布局系统、编辑器行为接入同一状态来源。Zen 作为复合协议层（sidebar/layout/focus/typewriter），Typewriter 作为独立双态能力，并通过“进入 Zen 强制开启、退出恢复用户偏好”实现策略覆盖。Focus Zen 作为 Zen 子模式，只控制非编辑 UI 的显隐与唤醒，不改变文档内容模型。

**Tech Stack:** React 19, TypeScript, Zustand, Tiptap, Tauri 2, Vitest

---

## 0. 持久化方案调研与选型（先于开发）

### 方案 A：继续直接使用 `localStorage`（当前语言设置做法）
- 优点：零新增依赖，接入最快。
- 缺点：键分散、缺乏 schema/version、跨功能扩展会快速失控。
- 风险：多模块并发写入时易出现键名漂移、默认值不一致。

### 方案 B：引入统一前端设置仓库（Zustand + persist middleware）
- 优点：
  - 统一 schema（例如 `AppSettings`），后续功能可持续扩展；
  - 与现有 Zustand 技术栈一致，开发成本低；
  - 可配置 `partialize` 仅持久化设置，避免污染运行态。
- 缺点：需要一次性迁移现有 locale 持久化键。
- 风险：SSR/测试环境需要 storage fallback（可控）。

### 方案 C：改为 Tauri 原生持久化（插件 store / Rust 配置文件）
- 优点：可跨窗口/跨 WebView，未来可做更强一致性。
- 缺点：当前工程未引入 `tauri-plugin-store`，新增 Rust+前端桥接成本更高。
- 风险：本轮会显著增加非核心工作量，拖慢交付。

### 选型结论
- **本轮推荐：方案 B（Zustand persist）**。
- **落地策略：**
  1. 先新增统一 `settings` slice + 持久化；
  2. 把 `locale` 从 `i18n/index.ts` 的散键迁移到 settings（兼容读取旧键）；
  3. Typewriter / FocusZen 偏好统一接入 settings；
  4. 预留未来切换到 Tauri store 的 storage adapter 接口。
  5. 在本轮计划内明确迁移路径与兼容策略，保证后续可平滑迁移到 Tauri 存储而不破坏已有用户数据。

---

## 1. 任务分解（按优先级与依赖排序，逐个执行）

### Task 1 (P0): 建立统一设置持久化底座（必须先做）

**Files:**
- Create: `src/state/slices/settingsSlice.ts`
- Create: `src/state/slices/settingsSlice.test.ts`
- Modify: `src/state/verification.test.ts`
- Modify: `src/i18n/index.ts`

**Scope:**
- 定义 `AppSettings` schema（最小包含：`localePreference`、`typewriterEnabledByUser`、`focusZenEnabledByUser`）。
- 使用 persist middleware 进行持久化（含默认值、版本号与迁移入口）。
- locale 读取兼容旧 `writer.locale.preference` 键并完成迁移。
- 增加存储抽象层（如 `SettingsStorageAdapter`），默认接入 web storage，并预留 Tauri store adapter 位置。
- 输出迁移说明：从 web storage -> Tauri store 的一次性搬迁规则（读取旧值、写入新值、成功后保留回退窗口）。

**Done when:**
- 语言设置与新设置项都通过统一 settings 读写。
- 重启后状态可恢复。
- 有明确、可执行的 Tauri 存储平滑迁移策略与测试覆盖。

---

### Task 2 (P0): 菜单能力重命名与命令接线（Focus -> Typewriter）

**Files:**
- Modify: `src-tauri/src/menu.rs`
- Modify: `src/i18n/messages.ts`
- Modify: `src/app/commands/viewCommands.ts`
- Modify: `src/app/AppSettingsBehavior.test.ts`

**Scope:**
- 视图菜单文案从“专注模式/Focus Mode”改为“打字机模式/Typewriter Mode”。
- 保持命令 ID 稳定或按需迁移（若改 ID，需同时改桥接与测试）。
- 菜单行为变为真正 Toggle，而不是 `status.menu.todo`。

**Done when:**
- 菜单点击能稳定切换 typewriter 状态。
- 文案与测试同步通过。

---

### Task 3 (P0): 视图模式状态机（Zen / FocusZen / Typewriter 解耦）

**Files:**
- Create: `src/state/slices/viewModeSlice.ts`
- Create: `src/state/slices/viewModeSlice.test.ts`
- Modify: `src/app/App.tsx`
- Modify: `src/ui/editor/Editor.tsx`

**Scope:**
- 建立模式状态：`isZen`、`isFocusZen`、`isTypewriterActive`。
- 实现策略覆盖：
  - 进入 Zen => 强制开启 typewriter，并记录进入前用户偏好快照。
  - 退出 Zen => 恢复进入前用户偏好。
- Focus Zen 只影响 UI 显示，不直接改用户偏好。

**Done when:**
- 可从状态层验证“强制开启 + 恢复”逻辑。

---

### Task 4 (P0): 响应式档位与 200ms 防抖

**Files:**
- Create: `src/ui/layout/useViewportTier.ts`
- Create: `src/ui/layout/useViewportTier.test.ts`
- Modify: `src/app/App.tsx`

**Scope:**
- 实现档位：`Min (<=640)` / `Default (640~1439)` / `Airy (>=1440)`。
- 跨档切换使用 200ms debounce。
- 输出给 sidebar/editor/focus 模块统一消费。

**Done when:**
- 连续拖拽窗口不抖动，跨档状态稳定。

---

### Task 5 (P0): 窗口基线参数对齐（默认尺寸与最小限制）

**Files:**
- Modify: `src-tauri/tauri.conf.json`
- Create: `src/app/AppWindowSpec.test.ts`

**Scope:**
- 将默认窗口尺寸对齐文档推荐值（`1180 x 800`）。
- 增加窗口最小尺寸限制（`640 x 480`）。
- 保证窗口尺寸策略与响应式档位定义一致。

**Done when:**
- 应用启动尺寸与最小缩放边界满足尺寸清单。

---

### Task 6 (P0): Sidebar 的 Min 档 Overlay 与自动禅

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `src/ui/sidebar/Sidebar.tsx`
- Create: `src/ui/sidebar/SidebarResponsiveBehavior.test.ts`

**Scope:**
- Min 档默认收起 sidebar。
- Min 档手动展开采用 overlay（覆盖编辑区，不推挤布局）。
- 手动收起 sidebar 进入基础禅（Toggle Zen）。
- Min 档 Header 信息降级为“仅文件名”。
- Overlay 模式下点击编辑区（overlay 外部）自动收起 sidebar（标准 drawer 行为）。
- Min 档面包屑降级为 `... / filename.md` 形态，并定义超长文件名截断策略（尾部省略）。

**Done when:**
- 640 以下体验符合文档与原型。

---

### Task 7 (P0): 编辑区尺寸体系（Top/Side/850/40vh）

**Files:**
- Modify: `src/ui/editor/Editor.css`
- Modify: `src/ui/editor/components/EditorShell.tsx`
- Modify: `src/ui/editor/EditorStyles.test.ts`

**Scope:**
- 应用 Top 64/32、Side 32/16、正文最大宽 850、底部 40vh。
- 保留现有查找/大纲/slash 等层级关系。

**Done when:**
- 三档视觉参数可验证。

---

### Task 8 (P0): Typewriter 45% 锚点算法

**Files:**
- Create: `src/ui/editor/hooks/useTypewriterAnchor.ts`
- Create: `src/ui/editor/hooks/useTypewriterAnchor.test.ts`
- Modify: `src/ui/editor/Editor.tsx`

**Scope:**
- 在编辑器 selectionUpdate / transaction 时，保持光标行接近视口 45%。
- 避免 IME 组合输入抖动与滚动回跳。
- 增加激活门槛：仅当文档内容总高度超过可视区高度（>1 屏）时才启用锚点滚动锁定。
- `useTypewriterAnchor` 只消费 `viewModeSlice.isTypewriterActive`，不在 hook 内自行管理开关，确保 Zen 退出恢复逻辑单一来源。

**Done when:**
- 打字过程中视线稳定且无明显抖动。

---

### Task 9 (P0): Focus Zen（UI 自动消隐 + 顶/底 50px 唤醒 + Esc 退出）

**Files:**
- Create: `src/ui/layout/useFocusZenWakeup.ts`
- Modify: `src/ui/editor/components/EditorShell.tsx`
- Modify: `src/ui/statusbar/StatusBar.tsx`
- Modify: `src/ui/editor/Editor.css`
- Create: `src/ui/layout/FocusZenBehavior.test.ts`

**Scope:**
- Focus Zen 开启时 header/statusbar 默认隐藏。
- 鼠标进入顶部/底部 50px 时 200ms 渐显。
- 支持双击侧边栏按钮触发/退出 Focus Zen（按文档协议）。
- 支持 Esc 退出；支持唤醒 Header 后点击侧边栏按钮退出。
- 保留快捷键入口（默认沿用 `F11`，如后续文档指定再替换）。
- Esc 退出优先级：若当前有活跃编辑器浮层（Slash Menu / Find Panel / 其他临时浮层），Esc 优先关闭浮层；仅在无活跃浮层时退出 Focus Zen。

**Done when:**
- 与 `11_v5_focus_zen.html` 核心交互一致。

---

### Task 10 (P1): Slash Menu 边界算法对齐文档

**Files:**
- Modify: `src/ui/editor/menus/SlashMenu.tsx`
- Modify: `src/ui/editor/Editor.css`
- Create: `src/ui/editor/menus/SlashMenuBoundary.test.ts`

**Scope:**
- 下方空间 <500 且上方足够 => 向上翻转。
- 视口高度 <500 => `max-height: 85%` + 内滚动。
- 右边缘防溢出：`x = viewportWidth - menuWidth - 10`。
- 视觉参数对齐：单项高度 34px、圆角 12px。

**Done when:**
- 所有边界场景位置正确、无越界。

---

### Task 11 (P1): Retina Hairline + 状态灯参数收敛

**Files:**
- Modify: `src/index.css`
- Modify: `src/ui/statusbar/StatusBar.css`
- Create: `src/ui/statusbar/StatusBarVisualSpec.test.ts`

**Scope:**
- DPR>=2 时统一 0.5px 边线策略。
- Saving 圆点改 2s pulse；Saved 30% 透明；Unsaved amber 常亮。

**Done when:**
- 样式与尺寸清单一致。

---

### Task 12 (P1): 设置面板接入（可选但建议同轮）

**Files:**
- Modify: `src/ui/components/Settings/SettingsPanel.tsx`
- Modify: `src/i18n/messages.ts`
- Create: `src/ui/components/Settings/SettingsViewModes.test.ts`

**Scope:**
- 在 `设置 > 编辑器` 提供打字机/FocusZen 开关（与菜单同源状态）。
- 开关状态持久化且即时生效。

**Done when:**
- 设置与菜单切换一致，不互相打架。

---

### Task 13 (P1): Settings Dialog 最小模式适配

**Files:**
- Modify: `src/app/App.css`
- Modify: `src/ui/components/Settings/SettingsPanel.tsx`
- Modify: `src/ui/components/Settings/SettingsPanelBehavior.test.ts`

**Scope:**
- 保持 Modal 模式（遮罩层）不变。
- 在 Min 模式（窄窗）应用 `Inset: 20px`。
- Min 模式取消大阴影，避免压迫感与遮挡问题。

**Done when:**
- 设置弹窗在最小窗口下符合尺寸清单描述。

---

### Task 14 (P0): 联调验收与文档回填

**Files:**
- Modify: `docs/current/交互/方案/UI设计详细交付文档.md`（仅补“实现备注/差异”）
- Modify: `docs/current/交互/方案/尺寸清单.md`（如有偏差需注明）
- Create: `docs/current/交互/实施验收清单.md`

**Scope:**
- 运行测试并补人工验收项。
- 对“未实现/延期项”写清替代说明，避免历史决策丢失。

**Done when:**
- 自动化 + 手工验收结论完整可追溯。

---

## 2. 进度板（初始）

| ID | 任务 | 优先级 | 依赖 | 状态 |
|---|---|---|---|---|
| T1 | 设置持久化底座 | P0 | 无 | TODO |
| T2 | 菜单重命名与接线 | P0 | T1 | TODO |
| T3 | 视图模式状态机 | P0 | T1 | TODO |
| T4 | 响应式档位+防抖 | P0 | T3 | TODO |
| T5 | 窗口基线参数对齐 | P0 | T4 | TODO |
| T6 | Sidebar Overlay/自动禅 | P0 | T4 | TODO |
| T7 | 编辑区尺寸体系 | P0 | T4 | TODO |
| T8 | Typewriter 45% 算法 | P0 | T3,T7 | TODO |
| T9 | Focus Zen | P0 | T3,T7 | TODO |
| T10 | Slash 边界算法 | P1 | T7 | TODO |
| T11 | Retina/状态灯参数 | P1 | T7 | TODO |
| T12 | 设置面板接入 | P1 | T1,T3 | TODO |
| T13 | Settings Dialog 最小模式适配 | P1 | T4 | TODO |
| T14 | 联调验收与文档回填 | P0 | T1~T13 | TODO |

---

## 3. 风险与前置确认

1. `Focus Zen` 快捷键文档写“快捷键”，但未明确具体键位；建议本轮先保留 `F11`（当前原“专注模式”键位）避免学习成本。
2. 侧边栏按钮“双击进入/退出 Focus Zen”会与单击“展开侧边栏”冲突；需要明确双击优先策略（建议：单击维持 sidebar toggle，双击仅在 Zen 态下触发 Focus Zen）。
3. Typewriter 45% 在不同字体/行高下可能有轻微偏差，建议验收容忍区间 ±2%。
4. 本轮先落地 `Zustand persist`，后续切换 Tauri store 时需遵守“先读旧值再迁移写入新值”的平滑迁移策略，避免设置丢失。
