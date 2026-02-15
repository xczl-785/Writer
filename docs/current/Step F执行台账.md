# Step F 执行台账（V1）

## 1. 目的

把 `质量验收清单_V1.md` 转成可执行、可回填、可审计的门禁台账。

## 1.1 约束引用

1. `docs/current/质量验收清单_V1.md`
2. `docs/standards/RELEASE_EVIDENCE_STANDARD.md`
3. `docs/current/需求追溯表_V1.md`

## 2. 状态定义

- `NOT_STARTED`：未开始
- `IN_PROGRESS`：执行中
- `BLOCKED`：被阻塞（需注明阻塞原因）
- `PASSED`：通过
- `FAILED`：未通过（需登记缺陷）

## 3. 执行顺序（建议）

1. 功能门禁：QA-S1-01 ~ QA-S1-12
2. 核心回归：R1 ~ R6
3. 非功能门禁：NFR-01 ~ NFR-04
4. 汇总判定：是否满足 Step F 出口条件

## 4. 功能门禁执行台账

| 检查ID   | 状态        | 执行日期 | 执行平台 | 执行人 | 证据ID | 证据路径/说明 | 缺陷ID |
| -------- | ----------- | -------- | -------- | ------ | ------ | ------------- | ------ |
| QA-S1-01 | NOT_STARTED | -        | -        | -      | -      | -             | -      |
| QA-S1-02 | NOT_STARTED | -        | -        | -      | -      | -             | -      |
| QA-S1-03 | NOT_STARTED | -        | -        | -      | -      | -             | -      |
| QA-S1-04 | NOT_STARTED | -        | -        | -      | -      | -             | -      |
| QA-S1-05 | NOT_STARTED | -        | -        | -      | -      | -             | -      |
| QA-S1-06 | NOT_STARTED | -        | -        | -      | -      | -             | -      |
| QA-S1-07 | NOT_STARTED | -        | -        | -      | -      | -             | -      |
| QA-S1-08 | NOT_STARTED | -        | -        | -      | -      | -             | -      |
| QA-S1-09 | NOT_STARTED | -        | -        | -      | -      | -             | -      |
| QA-S1-10 | NOT_STARTED | -        | -        | -      | -      | -             | -      |
| QA-S1-11 | NOT_STARTED | -        | -        | -      | -      | -             | -      |
| QA-S1-12 | NOT_STARTED | -        | -        | -      | -      | -             | -      |

## 5. 核心回归与非功能门禁台账

| 检查ID | 类型        | 状态        | 执行日期 | 执行平台 | 执行人 | 指标结果/结论                                                                      | 证据ID | 证据路径/说明 |
| ------ | ----------- | ----------- | -------- | -------- | ------ | ---------------------------------------------------------------------------------- | ------ | ------------- |
| R1     | 回归        | NOT_STARTED | -        | -        | -      | -                                                                                  | -      | -             |
| R2     | 回归        | NOT_STARTED | -        | -        | -      | -                                                                                  | -      | -             |
| R3     | 回归        | NOT_STARTED | -        | -        | -      | -                                                                                  | -      | -             |
| R4     | 回归+性能   | NOT_STARTED | -        | -        | -      | -                                                                                  | -      | -             |
| R5     | 回归+性能   | NOT_STARTED | -        | -        | -      | -                                                                                  | -      | -             |
| R6     | 回归+可靠性 | NOT_STARTED | -        | -        | -      | Sprint 1: 基础路径（原子写成功+简单失败）；Sprint 3: 完整路径（中断注入+残留清理） | -      | -             |
| NFR-01 | 非功能      | NOT_STARTED | -        | -        | -      | -                                                                                  | -      | -             |
| NFR-02 | 非功能      | NOT_STARTED | -        | -        | -      | -                                                                                  | -      | -             |
| NFR-03 | 非功能      | NOT_STARTED | -        | -        | -      | -                                                                                  | -      | -             |
| NFR-04 | 非功能      | NOT_STARTED | -        | -        | -      | -                                                                                  | -      | -             |

## 6. 阻塞与缺陷记录

| 日期 | 项目ID | 阻塞/缺陷描述 | 影响范围 | 责任人 | 预计解除时间 |
| ---- | ------ | ------------- | -------- | ------ | ------------ |
| -    | -      | -             | -        | -      | -            |

## 6.1 证据ID与路径规则

1. 证据 ID 命名：`EVI-YYYYMMDD-<check-id>-<seq>`。
2. 证据文件命名：`YYYYMMDD_HHMM_<check-id>_<platform>_<owner>.<ext>`。
3. 证据落盘目录：`docs/archive/evidence/YYYY-MM-DD/<topic>/`。
4. 性能项（R4/R5/NFR-01~03）必须附 5 次采样明细与中位数/P95。
5. 预算门禁执行命令：`bash scripts/perf/check_budget.sh <metrics.csv>`。

## 7. 出口判定（Step F）

- 判定时间：-
- 判定人：-
- 结论：-（通过/不通过）
- 结论依据：
  1. QA-S1-01 ~ QA-S1-12：-
  2. R1 ~ R6：-
  3. NFR-01 ~ NFR-04：-
  4. P0 缺陷状态：-

## 8. 固化动作（复盘通过后执行）

1. 在 `docs/archive/STEP_F_REVIEW_RECORD.md` 记录复盘结论。
2. 在 `docs/current/任务看板.md` 将 Step F 状态更新为 `DONE`。
3. 将稳定门禁规则沉淀到 `docs/frozen/`（若有新增约束）。
