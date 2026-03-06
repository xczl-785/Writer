# Writer V5 UI 设计详细交付文档 (开发参考)

> **面向对象**：实装 Agent / 前端开发工程师  
> **文档目标**：深度解析原型图背后的交互巧思与尺寸逻辑，确保在不同窗口档位下的书写体验绝对一致。

---

## 0. 交互边界决策表 (Interaction Decision Table)

开发 Agent 请优先遵循此表处理逻辑分支：

| 交互项 | 场景/条件 | 确定性决策 |
| :--- | :--- | :--- |
| **Zen 状态定义** | 隐藏侧边栏后 | 进入 **Zen Mode**。分为：自动禅 (Min)、基础禅 (Toggle)、极致禅 (Focus) |
| **极致禅模式 (Focus Zen)** | 双击侧边栏按钮 / 快捷键 | **UI 自动消隐**。退出：再次双击、按 `Esc` 或悬浮唤醒后点击按钮 |
| **打字机模式 (Typewriter)** | 点击菜单/快捷键 | **双态开关 (Toggle)**。开启后锁定 45% 视点 |
| **打字机 & Zen 联动** | 进入/退出 Zen Mode | **策略覆盖 + 状态恢复**。进入 Zen 时强制开启，退出后恢复用户原手动状态 |
| **Zen 模式侧边栏** | 640px 以下手动点开 | **Overlay 模式**（浮层覆盖，不推挤编辑区内容） |
| **窗口缩放切换** | 跨档位（如 642 -> 638） | **200ms 防抖 (Debounce)**，避免 UI 频繁闪烁 |
| **Min 跨档状态恢复** | `Default/Airy -> Min -> Default/Airy` | 进入 Min 时记录侧边栏可见态快照；离开 Min 时恢复进入前可见态 |
| **Slash Menu 水平定位** | 靠近视窗右边缘 | **自动平移 (Right-Edge Aware)**，确保不超出屏幕 |
| **设置弹窗 (Dialog)** | 通用 / 最小尺寸 | **Modal 模式**（带遮罩层）。Min 模式下固定 `Inset: 20px` |

---

## 1. 禅模式与沉浸式协议 (Zen & Immersion Protocol)

为了区分简单的“功能折叠”与真正的“深度创作”，我们将禅模式分为三个维度：

### 1.1 档位详解
- **自动禅 (Spatial Zen)** [触发：宽 < 640px]
    - 侧边栏强制收起；
    - 使用 **紧凑型间距** (Top 32px, Side 16px)；
    - Header 仅保留文件名。
- **基础禅 (Toggle Zen)** [触发：手动收起侧边栏]
    - 侧边栏隐藏；
    - 使用 **呼吸型间距** (Top 64px, Side 32px)；
    - UI 保持常显。
- **极致禅 (Focus Zen)** [触发：双击侧边栏按钮]
    - **UI 消隐**：Header (面包屑) 与 Footer (状态栏) 默认透明度降至 **0%**；
    - **悬浮唤醒**：当鼠标移动至视口顶部/底部 **50px** 范围内时，相关 UI 以 0.2s 渐变平滑浮现；
    - **退出方式**：双击侧边栏按钮退出，或在唤醒 Header 后点击侧边栏图标。

---

## 2. 响应式布局架构 (Responsive Architecture)

### 2.1 动态边衬与留白 (Dynamic Spacing)
布局参数应随视口档位动态切换，以平衡“空间感”与“信息密度”：

| 档位 | 窗口宽度 (W) | 顶部留白 (Top) | 左右内边距 (Side) | 侧边栏初始态 |
| :--- | :--- | :--- | :--- | :--- |
| **Min (Zen)** | `W <= 640px` | **`32px`** | **`16px`** | 收起 (Collapsed) |
| **Default** | `640 < W < 1440` | **`64px`** | **`32px`** | 开启 (Visible) |
| **Airy (4K+)** | `W >= 1440px` | **`64px`** | **`32px`** | 开启 (Visible) |

### 2.2 居中聚焦逻辑 (Centric Flow)
正文列宽锁定在 **850px**。多余的宽度通过 `margin: 0 auto` 平分。

---

## 3. 核心交互组件：Slash Menu (同步算法)

### 3.1 翻转与溢出控制
- **翻转阈值**：光标下方空间 < 500px 且上方空间充足时向上弹出。
- **极端空间保护**：若窗口高度总计 < 500px，菜单限制 `max-height: 85%` 并开启容器内滚动。
- **水平防溢出**：若 `cursorX + MenuWidth > ViewportWidth`，则菜单水平坐标偏移量 = `ViewportWidth - MenuWidth - 10px`。

---

## 4. 编辑器垂直节奏 (Vertical Rhythm)

### 4.1 底部锁定区
- **常驻留白**：文章末尾强制预留 **`40vh`** 滚动占位区。
- **打字机锚点**：开启模式后，光标物理位置强锁在视口垂直方向的 **`45%`** 处。

### 4.2 打字机模式 (Persistence & Toggle)
- **开关行为**：作为全局开关，通过 `Settings` 或 `Shortcut` 自由切换。
- **状态继承**：
    - **进入 Zen 模式**：无论用户之前是否手动开启，系统都会 **自动强制启用** 打字机录入，以求极致沉浸。
    - **退出 Zen 模式**：系统必须 **恢复 (Restore)** 到进入禅模式之前的用户偏好状态。如果用户此前是手动关闭状态，此时应自动恢复为关闭。

---

## 5. 视觉精致度规范 (Retina Refinement)

### 5.1 0.5px 精致线
- **实现**：在 Retina 屏（`device-pixel-ratio >= 2`）下，所有 border 呈现为 **0.5px**。
- **颜色**：`Zinc-200` (#E4E4E7)。

### 5.2 状态指示灯 (Status Light)
底栏左侧圆点动画：
- **Saving**: `animate-pulse` (2s 周期)。
- **Unsaved**: `amber-400` 常亮。
- **Saved**: `green-500` 低透明度 (30%)。

---

## 6. 交互附件索引
1. [响应式动态原型图](file:///Users/zhengpanpan/Program/Writer/docs/current/交互/方案/prototypes/07_v5_responsive_layout.html)
2. [精确参数清单.md](file:///Users/zhengpanpan/Program/Writer/docs/current/交互/方案/尺寸清单.md)
3. [极致禅模式 (Focus Zen) 原型](file:///Users/zhengpanpan/Program/Writer/docs/current/交互/方案/prototypes/11_v5_focus_zen.html)

## 7. 实现备注与差异（2026-03-04）

### 7.1 已实现映射
- Typewriter 改造为全局双态开关，并接入持久化（`settingsSlice`）。
- Zen / Focus Zen / Typewriter 已拆分为独立状态，支持「进入 Zen 强制 typewriter、退出恢复」。
- Focus Zen 已实现：UI 默认消隐、顶/底 50px 唤醒、Esc（无活跃浮层时）退出。
- Slash Menu 已实现右边缘防溢出、<500 高度保护、下方空间不足翻转。
- 设置面板已接入 `编辑器` 页：Typewriter 与 Focus Zen 开关，持久化且即时生效。

### 7.2 偏差与延期说明
- Focus Zen 快捷键入口：本轮未新增独立快捷键绑定，当前仅保留双击侧栏按钮 + Esc 退出链路。后续若确定固定键位（例如 F11），可在菜单命令层补入并复用现有状态机。
- Slash Menu 小窗保护采用 `max-height: 85vh`（等价于视口 85%）实现，以保证不同容器层级下的一致表现。

---
**交付结语**：V5 的精髓在于由于窗口缩减而带来的“密度控制”。请实装时务必注意：**越小的窗口，留白越要节制（32px/16px），越大的窗口，留白越要奢侈（64px/32px）**。
