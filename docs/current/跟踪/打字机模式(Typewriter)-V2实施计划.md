# 打字机模式 (Typewriter) V2 实施计划

> **状态**：进行中  
> **版本**：V2  
> **更新日期**：2026-03-08  
> **目标分支**：`codex/typewriter-v2`

---

## 1. 背景与策略

当前实现为“固定 45% 锚点 + 持续补偿”，与新版交互规格（`Free/Locked` 状态机、动态锚点、非输入跳转回退）存在结构性差异。  
本计划采用“分阶段替换 + 每阶段独立提交”的方式，在保持可编译与主流程兼容前提下，逐步切换到 V2。

核心策略：
- 阶段 1 起停用旧打字机补偿路径，切入 V2 状态机主链路。
- 每阶段完成后必须通过构建与目标测试再提交。
- 每阶段仅提交该阶段范围改动，保证可回滚、可对比。

---

## 2. 分阶段执行

### 阶段 1：状态机骨架接入（可运行）

**目标**
- 以 `Free/Locked` 状态机替换旧“固定锚点”逻辑。
- 接入“45% 双向触发 + 动态锚点采样 + 锁定态补偿”主流程。
- 保留现有菜单与视图态入口，不改用户入口行为。

**范围**
- `src/ui/editor/hooks/useTypewriterAnchor.ts`
- `src/ui/editor/domain/typewriter/*`
- 相关测试：`hooks` 与 `domain` 层

**验收**
- 可编译（`npm run build` 通过）。
- 旧逻辑不再作为主路径执行。
- TC-1 基本路径可跑通（双向触发进入 Locked）。
- 相关单测通过。

**提交**
- `feat(typewriter): phase1 introduce free-locked state machine core`

---

### 阶段 2：回退矩阵与非输入跳转治理

**目标**
- 实现“鼠标落点强制回退 Free”。
- 实现“查找跳转/大纲跳转/程序化跳转”回退 Free 且不回拉。
- 非落点点击（如滚动条）不触发回退。

**范围**
- `useTypewriterAnchor` 事件路由扩展
- `useFindReplace` / `useOutlineExtractor` / 可能的程序化定位桥接
- 编辑器桥接层必要标记传递

**验收**
- TC-3 通过。
- 评审补充 6.5 跳转矩阵覆盖核心项。
- 可编译与目标测试通过。

**提交**
- `feat(typewriter): phase2 add free-fallback matrix for non-input jumps`

---

### 阶段 3：边界与动画策略收口

**目标**
- 补齐 IME `compositionend` 闭环校准。
- 补齐短内容保护、极限路径“向上补偿降级 Free”。
- 锁定态采用手动补偿 + 自控动画（<=150ms），不依赖默认 smooth。

**范围**
- `useTypewriterAnchor` 动画与边界逻辑
- 相关 domain 辅助函数与测试

**验收**
- TC-2 与边界项通过。
- 锁定态方向键卷轴平滑、无明显抖动回拉。
- 可编译与目标测试通过。

**提交**
- `feat(typewriter): phase3 harden ime-boundary and controlled compensation animation`

---

### 阶段 4：配置收敛与文档收口

**目标**
- 确认仅保留菜单入口（已存在），设置页不暴露 typewriter 开关（保持当前）。
- 清理 V1 残留常量/注释/测试预期。
- 更新技术文档与跟踪台账。

**范围**
- `docs/current/跟踪/*`
- `docs/全局资产/技术/*`（仅确有稳定事实时更新）
- 代码残留清理

**验收**
- TC-4 通过。
- 文档与实现一致。
- 可编译与回归测试通过。

**提交**
- `chore(typewriter): phase4 converge config and docs for v2`

---

## 3. 统一验证基线（每阶段执行）

- 构建验证：`npm run build`
- 目标测试（随阶段扩展）
  - `npm run test -- src/ui/editor/hooks/useTypewriterAnchor.test.ts`
  - `npm run test -- src/ui/editor/domain/typewriter/typewriterDomain.test.ts`
  - 涉及回退矩阵时补跑 Outline / Find 相关测试

说明：当前仓库存在与本需求无关的既有失败（`SlashMenuBoundary.test.ts`），不作为 Typewriter V2 阶段阻塞项，但每次提交都会记录其状态。

---

## 4. 提交与回滚约束

- 每个阶段只允许一个主题 commit，可附带必要测试调整。
- 禁止跨阶段混改（例如阶段 1 不提前做阶段 3 动画细节）。
- 如阶段内出现不稳定，回滚到上一个阶段 commit 继续排查。

---

## 5. 当前进度（2026-03-08）

- [x] 阶段 1：状态机骨架接入
- [x] 阶段 2：回退矩阵与非输入跳转治理
- [x] 阶段 3：边界与动画策略收口
- [x] 阶段 4：配置收敛与文档收口
