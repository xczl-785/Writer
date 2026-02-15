# Perf Scripts

## 1. 预算校验
```bash
bash scripts/perf/check_budget.sh scripts/perf/metrics.template.csv
```

## 2. 输入格式
CSV 两列：`metric,value`，首行为表头。

## 3. 当前硬门禁指标
1. `cold_start_ttc_p95_ms <= 1800`
2. `hot_start_ttc_p95_ms <= 900`
3. `input_latency_p95_ms <= 33`
4. `input_dropped_chars = 0`
5. `atomic_write_integrity_pass = true`

