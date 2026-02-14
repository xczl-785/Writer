# Writer 任务板 V2（精简）

## 使用规则
1. 一次只推进一个 Step。
2. 每个 Step 结束必须先复盘确认，再进入下一步。
3. 未冻结的内容不得进入开发任务拆分。
4. 复盘通过后，必须执行“固化资产”：将已确认结论沉淀到 `docs/frozen/` 与 `docs/archive/`，并从任务板移除已完成细节。

## 当前状态
- 当前进行中：Step D（架构与模块边界）
- 当前目标：冻结模块边界、数据流、目录结构，供任务拆分直接使用

## 已完成（已固化）
1. Step A：产品约束确认（通过）
- 资产：`docs/frozen/PRODUCT_CONSTRAINTS.md`

2. Step B：技术选型冻结（通过）
- 产物：`docs/frozen/TECH_BASELINE.md`
- 合并记录：`docs/archive/STEP_B_MERGE_RECORD.md`
- 决策台账：`docs/frozen/DECISIONS_LOG.md`

3. Step C：UI/UX 风格冻结（通过）
- 产物：`docs/frozen/DESIGN_BASELINE.md`
- 复盘记录：`docs/archive/STEP_C_REVIEW_RECORD.md`

## 待进行步骤

### Step D：架构与模块边界（Engineering Blueprint）
- 输入：`docs/frozen/TECH_BASELINE.md`、`docs/frozen/DESIGN_BASELINE.md`
- 输出：`docs/current/ENGINEERING_BLUEPRINT.md`
- 状态：`IN_PROGRESS`

### Step E：Sprint 1 任务拆分
- 输入：`docs/current/ENGINEERING_BLUEPRINT.md`
- 输出：`docs/current/SPRINT_1_TASKS.md`
- 状态：`PENDING`
- 门禁：必须先通过 D-007（Roundtrip Spike）

### Step F：验收与回归基线
- 输入：`docs/current/SPRINT_1_TASKS.md`
- 输出：`docs/current/QA_CHECKLIST_V1.md`
- 状态：`PENDING`
