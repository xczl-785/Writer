# V1 需求追溯矩阵（FR -> Task -> QA -> Evidence）

- 当前状态：IN_REVIEW
- 最后更新时间：2026-02-15
- 上游来源：`docs/frozen/PRD_V1.md`、`docs/current/Sprint1任务拆分.md`、`docs/current/QA_CHECKLIST_V1.md`

## 1. 说明
本矩阵用于统一追溯链路，避免“需求已实现但无法证明”。

## 2. 追溯矩阵

| FR | 需求 | 任务映射 | QA 映射 | 证据路径 |
|---|---|---|---|---|
| FR-01 | 即时渲染编辑 | S1-06 | QA-S1-06, R1 | `docs/archive/evidence/<date>/qa/` |
| FR-02 | 段落级格式快捷键 | S1-06（S1 子集：标题 1..3） | QA-S1-06 | `docs/archive/evidence/<date>/qa/` |
| FR-03 | 行内样式快捷键 | S1-06（S1 子集：B/I） | QA-S1-06 | `docs/archive/evidence/<date>/qa/` |
| FR-04 | 代码块编辑 | S1-05, S1-06 | QA-S1-05, QA-S1-06 | `docs/archive/evidence/<date>/qa/` |
| FR-05 | 图片粘贴与本地保存 | Sprint 3 规划项 | R6（S3 完整路径） | `docs/archive/evidence/<date>/stability/` |
| FR-06 | 自动保存 | S1-07, S1-10 | QA-S1-07, QA-S1-10, R1, R2 | `docs/archive/evidence/<date>/qa/` |
| FR-07 | 撤销/重做 | S1-06 | QA-S1-06 | `docs/archive/evidence/<date>/qa/` |
| FR-08 | 侧边栏文件树 | S1-08 | QA-S1-08 | `docs/archive/evidence/<date>/qa/` |
| FR-09 | 应用内新建文件 | Sprint 2 规划项 | 待映射（Step F 扩展） | `docs/archive/evidence/<date>/qa/` |
| FR-10 | 文件重命名 | Sprint 2 规划项 | 待映射（Step F 扩展） | `docs/archive/evidence/<date>/qa/` |
| FR-11 | 文件删除 | Sprint 2 规划项 | 待映射（Step F 扩展） | `docs/archive/evidence/<date>/qa/` |
| FR-12 | 文件夹作为工作区 | S1-08 | QA-S1-08, R1 | `docs/archive/evidence/<date>/platform-*/` |

## 3. 回填规则
1. 每个 FR 至少绑定 1 个 QA 或回归用例。
2. 每个通过结论必须附证据路径。
3. 对于未进入当前 Sprint 的 FR，保留“规划项”状态并在后续 Sprint 更新。

