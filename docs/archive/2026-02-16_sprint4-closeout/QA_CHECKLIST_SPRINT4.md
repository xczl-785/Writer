# QA 验收清单 Sprint 4（V1 收尾）

## 1. 执行说明

- 平台：macOS + Windows
- 结果字段：`PASS / FAIL / BLOCKED`
- 证据目录：`docs/archive/evidence/2026-02-16/`

## 2. Must 12 全量回归

| 用例ID      | 需求                 | 步骤                     | 期望结果                   | 结果 | 现象                     | 证据                                                      |
| ----------- | -------------------- | ------------------------ | -------------------------- | ---- | ------------------------ | --------------------------------------------------------- |
| QA-S4-FR-01 | FR-01 即时渲染编辑   | 输入标题、列表、行内样式 | 所见即所得，无切换预览     | PASS | 本轮回归正常             | `docs/archive/evidence/2026-02-16/qa/Sprint4_回归记录.md` |
| QA-S4-FR-02 | FR-02 段落快捷键     | 触发 Cmd/Ctrl+1..3       | 样式变化正确，可回退       | PASS | 本轮回归正常             | `docs/archive/evidence/2026-02-16/qa/Sprint4_回归记录.md` |
| QA-S4-FR-03 | FR-03 行内快捷键     | 触发 Cmd/Ctrl+B/I        | 样式正确，可取消           | PASS | 本轮回归正常             | `docs/archive/evidence/2026-02-16/qa/Sprint4_回归记录.md` |
| QA-S4-FR-04 | FR-04 代码块编辑     | 输入 ``` 创建并编辑      | 代码块创建与编辑正常       | PASS | 本轮回归正常             | `docs/archive/evidence/2026-02-16/qa/Sprint4_回归记录.md` |
| QA-S4-FR-05 | FR-05 图片粘贴与保存 | 粘贴图片并检查 assets    | 落盘成功、引用正确、可显示 | PASS | 图片显示链路已复验通过   | `docs/archive/evidence/2026-02-16/qa/Sprint4_回归记录.md` |
| QA-S4-FR-06 | FR-06 自动保存       | 防抖、失焦、关闭前保存   | 数据不丢失，失败可见       | PASS | 自动保存策略本轮无异常   | `docs/archive/evidence/2026-02-16/qa/Sprint4_回归记录.md` |
| QA-S4-FR-07 | FR-07 撤销/重做      | 连续编辑后撤销/重做      | 顺序正确且稳定             | PASS | 本轮回归正常             | `docs/archive/evidence/2026-02-16/qa/Sprint4_回归记录.md` |
| QA-S4-FR-08 | FR-08 文件树         | 展开/折叠/切换文件       | 层级正确，切换正常         | PASS | 本轮回归正常             | `docs/archive/evidence/2026-02-16/qa/Sprint4_回归记录.md` |
| QA-S4-FR-09 | FR-09 新建文件       | 新建后立即编辑           | 文件可见、可编辑、可保存   | PASS | 新建可见性问题已修复验证 | `docs/archive/evidence/2026-02-16/qa/Sprint4_回归记录.md` |
| QA-S4-FR-10 | FR-10 重命名         | 重命名当前/非当前文件    | 刷新正确，编辑不中断       | PASS | 本轮回归正常             | `docs/archive/evidence/2026-02-16/qa/Sprint4_回归记录.md` |
| QA-S4-FR-11 | FR-11 删除文件       | 删除并确认               | 文件树与磁盘一致           | PASS | 本轮回归正常             | `docs/archive/evidence/2026-02-16/qa/Sprint4_回归记录.md` |
| QA-S4-FR-12 | FR-12 工作区         | 打开并重开恢复工作区     | 文件树可恢复并可编辑       | PASS | 本轮回归正常             | `docs/archive/evidence/2026-02-16/qa/Sprint4_回归记录.md` |

## 3. 关键异常与安全回归

| 用例ID       | 场景                      | 期望结果                     | 结果 | 现象                            | 证据                                                      |
| ------------ | ------------------------- | ---------------------------- | ---- | ------------------------------- | --------------------------------------------------------- |
| QA-S4-ERR-01 | 保存失败（权限不足）      | 状态栏有错误提示，不静默失败 | PASS | 自动化用例覆盖 + 本轮无静默失败 | `docs/archive/evidence/2026-02-16/logs/自动化验证结果.md` |
| QA-S4-ERR-02 | 图片粘贴失败（格式/大小） | 显示明确错误，不插入坏引用   | PASS | 本轮复验通过                    | `docs/archive/evidence/2026-02-16/qa/Sprint4_回归记录.md` |
| QA-S4-ERR-03 | 原子写失败注入            | 原文件不被破坏               | PASS | D-009 回归无异常                | `docs/archive/evidence/2026-02-16/logs/自动化验证结果.md` |
| QA-S4-ERR-04 | 切文件时 dirty flush      | 无数据丢失，流程可继续       | PASS | 本轮回归通过                    | `docs/archive/evidence/2026-02-16/qa/Sprint4_回归记录.md` |

## 4. 通过标准

1. Must 12 回归全通过或有明确豁免记录。
2. 关键异常场景全部有证据且无静默失败。
3. 双平台关键路径验证完成（见平台矩阵）。
