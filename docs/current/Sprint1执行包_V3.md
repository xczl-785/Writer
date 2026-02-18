# Sprint1 执行包（V3 核心稳定）

## 1. 目标

围绕 V3 的 P0/P1 主线，完成编辑器破坏性操作一致化与表格删除边界行为补强。

## 2. 任务拆分

- [x] S1-V3-01 统一破坏性动作提示文案与状态回收策略（删行/删列/删表等）
- [x] S1-V3-02 破坏性动作撤销链路回归（误删恢复、连续撤销稳定性）
- [x] S1-V3-03 表格删除与边界行为一致化（空段落前后、连续表、选区状态）
- [x] S1-V3-04 手工回归最小集执行（编辑器核心链路，Web 模式阻塞已记录）

## 3. QA 清单

| 用例ID      | 检查项                    | 期望结果                                     | 结果        | 证据                                                                    |
| ----------- | ------------------------- | -------------------------------------------- | ----------- | ----------------------------------------------------------------------- |
| QA-S1-V3-01 | 破坏性动作提示一致性      | 删除类动作提示文案统一，状态在超时后自动回收 | PASS        | `src/ui/editor/Editor.tsx` `src/ui/editor/EditorTableControls.test.ts`  |
| QA-S1-V3-02 | 误删恢复能力              | `Cmd/Ctrl+Z` 可恢复删除动作，内容结构正确    | PASS        | `src/ui/editor/Editor.tsx` `src/ui/editor/EditorTableControls.test.ts`  |
| QA-S1-V3-03 | 表格两段式删除行为        | 第一次 Backspace 选中整表，第二次删除整表    | PASS        | `src/ui/editor/Editor.tsx` `src/ui/editor/EditorTableBackspace.test.ts` |
| QA-S1-V3-04 | 显式删除整表入口          | 表格控制区可见“Delete table”并可删除当前表格 | BLOCKED-WEB | `http://127.0.0.1:4173/`（Open Folder 对话框失败）                      |
| QA-S1-V3-05 | 连续表格/空段落边界稳定性 | 边界场景下不误删、不丢选区                   | PASS        | `src/ui/editor/Editor.tsx` `src/ui/editor/EditorTableBackspace.test.ts` |
| QA-S1-V3-06 | 自动化门禁                | `npm run test`、`npm run build` 均通过       | PASS        | `npm run test`=87/87，`npm run build`=0                                 |

## 4. DoD

1. S1-V3-01~S1-V3-04 全部完成；手工 E2E 在 Web 模式阻塞项已留档，待 Tauri 补测。
2. FR-V3-01、FR-V3-02 在追溯矩阵中状态可追踪。
3. 无新增 P0/P1 缺陷遗留。

## 5. 实施计划（已启动）

## 5.1 实施顺序

1. 先落地 S1-V3-01：统一删除类动作提示文案与状态回收逻辑。
2. 再落地 S1-V3-03：补齐表格边界删除行为（在现有两段式删表基础上增强）。
3. 然后执行 S1-V3-02：重点验证撤销链路与连续撤销稳定性。
4. 最后执行 S1-V3-04：手工最小回归 + 自动化门禁。

## 5.2 预估改动范围

- 核心代码：`src/ui/editor/Editor.tsx`
- 编辑器测试：`src/ui/editor/EditorTableBackspace.test.ts`、`src/ui/editor/EditorTableControls.test.ts`、必要时新增边界测试
- 文档回写：本执行包 + `docs/current/V3 需求追溯矩阵.md` + `docs/current/V3启动看板.md`

## 5.3 风险与防护

1. 风险：边界修复引入误删。
   - 防护：每次删除行为都要求可撤销，并补充回归用例。
2. 风险：提示文案分散导致不一致。
   - 防护：统一提示口径并集中检查删除类操作。
3. 风险：连续编辑场景出现选区漂移。
   - 防护：增加“连续表格 + 空段落 + 快速 Backspace”场景测试。

## 5.4 验收证据记录模板

| 项目       | 命令/操作       | 结果 | 证据路径 |
| ---------- | --------------- | ---- | -------- |
| 自动化测试 | `npm run test`  |      |          |
| 构建验证   | `npm run build` |      |          |
| 手工回归   | QA-S1-V3-01~05  |      |          |
