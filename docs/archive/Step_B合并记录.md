# Step B 合并记录（评审并入）

## 输入文档

- 基线：`docs/frozen/TECH_BASELINE.md`
- 评审：`docs/archive/TECH_BASELINE_REVIEW.md`

## 合并结论

- 结论：通过（已采纳关键约束并修订回退策略）

## 采纳项

1. TipTap Roundtrip Spike 作为 Step D->E 门禁
2. 文件原子写入强制要求
3. Tauri 回退条件改为“P0 + 两轮失败 + 评审确认”
4. 编辑器回退不预设单一方案，改为评审选择

## 输出资产

- `docs/frozen/TECH_BASELINE.md`（合并后技术基线）
- `docs/frozen/DECISIONS_LOG.md`（新增 D-007~D-010）
