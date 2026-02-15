# Performance Budget（V1）

## 1. 目的
将现有性能口径统一为可执行的预算门禁。预算用于阻断明显性能回归，不替代功能验收。

## 2. 预算来源
1. `docs/frozen/PRODUCT_CONSTRAINTS.md`
2. `docs/current/QA_CHECKLIST_V1.md`
3. `docs/current/StepF执行台账.md`

## 3. 硬门禁（超出即不通过）
| 指标ID | 指标定义 | 预算阈值 | 单位 |
|---|---|---:|---|
| `cold_start_ttc_p95_ms` | 冷启动 TTC P95 | `<= 1800` | ms |
| `hot_start_ttc_p95_ms` | 热启动 TTC P95 | `<= 900` | ms |
| `input_latency_p95_ms` | 输入响应 P95 | `<= 33` | ms |
| `input_dropped_chars` | 连续输入丢字数 | `= 0` | count |
| `atomic_write_integrity_pass` | 原子写失败不损坏原文件 | `true` | bool |

## 4. 目标值（用于优化，不阻断）
| 指标ID | 目标值 | 单位 |
|---|---:|---|
| `cold_start_ttc_p95_ms` | `<= 1200` | ms |
| `hot_start_ttc_p95_ms` | `<= 600` | ms |
| `input_latency_p95_ms` | `<= 16` | ms |

## 5. 采样口径
1. 每项至少 5 次采样，记录原始值与 P95。
2. 冷启动采样前必须重启应用并清理热缓存影响。
3. 同一批次使用同一机器和同一数据集。

## 6. 输入数据格式
预算校验脚本读取 CSV（两列：`metric,value`）：

```csv
metric,value
cold_start_ttc_p95_ms,1720
hot_start_ttc_p95_ms,780
input_latency_p95_ms,24
input_dropped_chars,0
atomic_write_integrity_pass,true
```

## 7. 执行命令
```bash
bash scripts/perf/check_budget.sh scripts/perf/metrics.template.csv
```

CI 入口：
1. GitHub Actions workflow：`.github/workflows/perf-budget.yml`
2. 触发时机：`pull_request`、`push(main)`、`workflow_dispatch`
3. 手动触发可传入 `metrics_file`（默认 `scripts/perf/metrics.template.csv`）

返回码规则：
1. `0`：预算通过
2. `1`：预算不通过或缺失指标

## 8. 与 Step F 的关系
1. `StepF执行台账` 记录结论与证据路径。
2. 本预算脚本提供门禁判定结果（pass/fail）与失败明细。
3. 最终结论回填 `docs/archive/STEP_F_REVIEW_RECORD.md`。
