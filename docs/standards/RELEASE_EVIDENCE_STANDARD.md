# 发布与验收证据规范（V1）

## 1. 目的
统一 Step F 与 V1 发布阶段的证据沉淀口径，保证验收结论可复核。

## 2. 证据目录约定
所有证据统一存放在：
- `docs/archive/evidence/`

按日期与主题分层：
- `docs/archive/evidence/YYYY-MM-DD/<topic>/`

示例 topic：
- `qa`、`performance`、`stability`、`platform-macos`、`platform-windows`

## 3. 文件命名
命名格式：
- `YYYYMMDD_HHMM_<check-id>_<platform>_<owner>.<ext>`

示例：
- `20260215_1430_R4_macos_codex.md`
- `20260215_1505_QA-S1-09_windows_alice.png`

## 4. 最小证据清单
每次 Step F 判定至少包含：
1. QA 门禁执行结果（QA-S1-01 ~ QA-S1-12）
2. 回归用例结果（R1 ~ R6）
3. NFR 指标数据（NFR-01 ~ NFR-04）
4. 缺陷清单与关闭状态（若有）

## 5. 数据格式要求
1. 指标数据必须包含原始值（不只写“通过/不通过”）。
2. 性能数据至少保留 5 次采样明细与中位数/P95。
3. 关键失败必须附带错误日志或截图。

## 6. 台账回填规则
1. `docs/current/StepF执行台账.md` 的“证据路径/说明”必须填写可定位路径。
2. 最终复盘时在 `docs/archive/STEP_F_REVIEW_RECORD.md` 汇总证据索引。

