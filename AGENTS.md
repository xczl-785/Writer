# AGENTS.md — Writer 项目 AI 助手指南

**最后更新**: 2026-03-01  
**项目**: Writer（本地优先 Markdown 编辑器）

---

## 1. 当前文档版图

```text
docs/
├── current/
│   └── 跟踪/
│       ├── 全流程需求跟踪台账.md
│       ├── 遗留问题.md
│       └── design-block-indicator-system.md
├── 全局资产/
│   ├── 产品/
│   ├── 治理/
│   └── 工程/
├── archive/
├── frozen/      # 兼容入口（长期资产已迁移）
├── standards/   # 兼容入口（长期资产已迁移）
└── 参考资料/
```

---

## 2. 执行边界（必须遵守）

1. `docs/current/` 仅放“当前进行中”文档。
2. `docs/全局资产/` 仅放“长期生效”文档，修改需谨慎。
3. 版本专项文档完成后必须归档到 `docs/archive/`。
4. 禁止直接删除历史决策记录，需保留替代说明。

---

## 3. 开发与文档协作要求

1. 代码改动保持小步提交，提交信息使用 Conventional Commits。
2. 不要用 `as any`、`@ts-ignore`、空 `catch` 掩盖问题。
3. 高风险改动前先落文档再落代码（需求/架构/UI 任一缺失时先补文档）。
4. 若发现需求与实现冲突，不得越权改需求文档，需先反馈给 PO。

---

## 4. 关键入口

- 需求总跟踪：`docs/current/跟踪/全流程需求跟踪台账.md`
- 需求遗留池：`docs/current/跟踪/遗留问题.md`
- 全局资产索引：`docs/全局资产/README.md`
- 最新版本归档：`docs/archive/2026-03-01_v5-closeout/README.md`

---

_本文档为执行期简化版指南，详细历史规则请查阅 `docs/archive/`。_
