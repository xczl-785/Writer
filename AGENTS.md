# AGENTS.md — Writer 项目 AI 助手指南

**最后更新**: 2026-03-20  
**项目**: Writer（本地优先 Markdown 编辑器）

---

## 1. 当前文档版图

```text
docs/
├── capability/         # 当前生效的 capability 文档与发现层文档
│   └── README.md
├── current/
│   └── 跟踪/
│       ├── 全流程需求跟踪台账.md
│       └── 遗留问题.md
├── generated/          # 自动生成的架构图
│   ├── README.md       # 使用说明
│   └── auto/           # PlantUML 文件
├── 全局资产/
│   ├── 产品/
│   ├── 治理/
│   └── 工程/
└── archive/
```

---

## 2. 架构快速理解

### 模块总览

查看 `docs/generated/auto/modules.puml` 了解模块间依赖关系。

### 核心模块

| 模块              | 职责             | 架构图                        |
| ----------------- | ---------------- | ----------------------------- |
| domains/file      | 文件树、路径处理 | `auto/domains/file.puml`      |
| domains/workspace | 工作空间管理     | `auto/domains/workspace.puml` |
| domains/editor    | 编辑器核心       | `auto/domains/editor.puml`    |
| services/markdown | Markdown 解析    | `auto/services/markdown.puml` |
| services/autosave | 自动保存         | `auto/services/autosave.puml` |
| state             | Zustand 全局状态 | `auto/state.puml`             |
| ui/*             | React 组件       | `auto/ui/*.puml`              |
| app               | 应用层、命令     | `auto/app.puml`               |

### UML 体系规则

1. **节点标识符**：`{模块}/{类名}`，如 `domains/file/FileService`
2. **关系类型**：`<|--` 继承、`<|..` 实现、`-->` 依赖
3. **更新方式**：`npm run uml:gen` 或 CI 自动更新
4. **详细说明**：`docs/generated/README.md`

### 快速命令

```bash
npm run uml:gen                        # 更新架构图
npm run uml:gen -- --module domains/file  # 只更新指定模块
```

---

## 3. 执行边界（必须遵守）

1. `docs/current/` 仅放"当前进行中"文档。
2. `docs/capability/` 仅放"当前生效"的 capability 文档、capability-index 与相关 shared-rule 文档。
3. `docs/全局资产/` 仅放"长期生效"文档，修改需谨慎。
4. `docs/generated/` 自动生成，禁止手动修改 `auto/` 目录。
5. 版本专项文档完成后必须归档到 `docs/archive/`。
6. 禁止直接删除历史决策记录，需保留替代说明。
7. 项目为跨平台工程，在开发功能等场景中，需要优先考虑跨平台的实现，或者兼容方式。

---

## 4. 开发与文档协作要求

1. 代码改动保持小步提交，提交信息使用 Conventional Commits。
2. 不要用 `as any`、`@ts-ignore`、空 `catch` 掩盖问题。
3. 高风险改动前先落文档再落代码（需求/架构/UI 任一缺失时先补文档）。
4. 若发现需求与实现冲突，不得越权改需求文档，需先反馈给 PO。
5. 涉及已有能力的修改，应优先检查 `docs/capability/` 下的 capability 文档。
6. 修改当前能力规则、入口或影响面后，应同步回写对应 capability 文档。

---

## 5. 关键入口

- Capability 目录：`docs/capability/README.md`
- 需求总跟踪：`docs/current/跟踪/全流程需求跟踪台账.md`
- 需求遗留池：`docs/current/跟踪/遗留问题.md`
- 全局资产索引：`docs/全局资产/README.md`
- 架构图说明：`docs/generated/README.md`

---

_本文档为执行期简化版指南，详细历史规则请查阅 `docs/archive/`。_
