# D-007 Spike 执行说明（派发版）

## 1. 任务目的
执行最小技术验证（Spike），确认 Markdown 与编辑器模型往返是否满足语义一致性要求：
`.md -> parse -> serialize -> .md`

该任务是门禁项，不是产品功能开发。

## 2. 背景与门禁
- 关联决策：`docs/frozen/DECISIONS_LOG.md` 中 D-007
- 门禁要求：Step D 结束前必须完成，未通过不得进入 Step E

## 3. 输入文档
1. `docs/frozen/ENGINEERING_BLUEPRINT.md`
2. `docs/frozen/TECH_BASELINE.md`
3. `docs/archive/SPIKE_ROUNDTRIP_REPORT.md`（报告模板）
4. `spike/roundtrip/README.md`
5. `spike/roundtrip/roundtrip.test.ts`

## 4. 任务边界
### In Scope
1. 仅实现并运行 Roundtrip Spike 所需最小代码
2. 完成 4 类用例验证：
- 标题（H1-H6）
- 列表（有序/无序/嵌套）
- 围栏代码块（含语言标识）
- 图片引用（`![alt](path)`）
3. 产出执行报告

### Out of Scope
1. UI 开发
2. 产品功能实现
3. 扩展 V1 范围
4. 与 Spike 无关的架构重构

## 5. 实施要求
1. 在 `spike/roundtrip/` 内补全可运行的 parse/serialize 实现（可先用最小可行组合）。
2. 保持改动最小，仅围绕 Spike。
3. 如果出现语义漂移，必须记录输入/输出差异示例。
4. 不得修改冻结范围文档（`docs/frozen/*`）的结论性内容。

## 6. 交付物（必须）
1. 可执行 Spike 代码（含运行命令）
2. `docs/archive/SPIKE_ROUNDTRIP_REPORT.md` 完整填充：
- 环境信息
- 各用例结果
- 是否通过 D-007
- 差异记录（若失败）
3. 一段简短结论（通过/不通过 + 下一步建议）

## 7. 验收标准
### 通过
- 4 类用例全部语义保持
- 报告完整且可复现
- 结论明确“通过 D-007”

### 不通过
- 任一核心语义丢失
- 报告缺失关键信息
- 无法复现执行过程

## 8. 失败处理规则
若不通过：
1. 明确失败用例与原因分类（解析丢失/序列化丢失/格式化偏差）
2. 给出最小修复建议（不超过 3 条）
3. 标记门禁状态为“不通过”

## 9. 输出格式（给管理者）
请最终输出：
1. 结论：通过/不通过
2. 用例汇总表（4 项）
3. 关键差异（若有）
4. 是否可进入 Step E

## 10. 备注
本任务属于“宏观流程门禁验证”，目标是降低后续任务拆分返工风险。
