# Writer 任务板（Step-by-Step）

## 使用规则
1. 严格按步骤推进：一次只做一个 Step。
2. 每个 Step 完成后，必须先做“复盘确认”，再进入下一步。
3. 未进入的 Step 不提前展开实现细节。

## 项目节奏状态
- 当前阶段：Phase 1（需求冻结完成，进入 PRD）
- 当前进行中：Step 2
- 下一个里程碑：PRD V1 冻结

## 任务看板

### Step 1：冻结 V1 范围（Must 12）
- 目标：把 Must 12 变成“最终冻结列表”，不再摇摆
- 输入：`docs/archive/COMPETITOR_AUDIT_RESULT.md`
- 输出：`docs/frozen/SCOPE_FREEZE_V1.md`
- 完成定义（DoD）：
  - Must 12 列表明确
  - Should/Could 明确进入 Backlog
  - Out 明确不进 V1
- 状态：`COMPLETED`
- 复盘记录：`有条件通过（表格能力延后，但列为 Phase 2 Top Priority）`

### Step 2：PRD V1（可执行）
- 目标：让模型拿到文档即可直接开发
- 输入：`docs/frozen/SCOPE_FREEZE_V1.md`
- 输出：`docs/frozen/PRD_V1.md`
- 完成定义（DoD）：
  - 每个 Must 都有用户场景
  - 每个 Must 都有交互规则
  - 每个 Must 都有验收标准
  - 非目标（Not in V1）明确
- 状态：`IN_PROGRESS`
- 复盘记录：`待填写`

### Step 3：开发任务拆分（首迭代）
- 目标：形成可并行执行的任务单
- 输入：`docs/frozen/PRD_V1.md`
- 输出：`SPRINT_1_TASKS.md`
- 完成定义（DoD）：
  - 任务粒度可在 1-2 天内完成
  - 每个任务有完成标准与回归点
  - 标注可并行与依赖关系
- 状态：`PENDING`
- 复盘记录：`待填写`

### Step 4：验收与回归清单
- 目标：建立统一验收口径，避免多模型输出偏差
- 输入：`SPRINT_1_TASKS.md`
- 输出：`QA_CHECKLIST_V1.md`
- 完成定义（DoD）：
  - 功能验收清单
  - 回归测试清单
  - 风险项与阻塞处理规则
- 状态：`PENDING`
- 复盘记录：`待填写`

## Backlog（本阶段不展开）
- Should/Could 功能项（来自能力盘点）
- 架构优化与性能深挖
- 主题系统和高级编辑增强

## 复盘模板（每步完成后填写）
- Step：
- 结果：通过 / 有条件通过 / 不通过
- 核心结论（3 行内）：
- 发现的问题：
- 调整决策：
- 是否进入下一步：是 / 否
