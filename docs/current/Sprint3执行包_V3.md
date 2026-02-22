# Sprint3 执行包（V3 稳定性治理与回归）

## 1. 目标

在 Sprint1/Sprint2 功能交付基础上，执行高风险回归最小集，收敛遗留缺陷，完成证据标准化。

## 2. 任务清单

### S3-V3-01：高风险回归最小集执行与问题收敛

| 编号 | 回归项 | 证据 | 结果 |
| ---- | ---- | ---- | ---- |
| R-01 | 自动化测试全量通过 | `npm run test` = 17/17 文件, 89/89 用例 | ✅ PASS |
| R-02 | TypeScript 编译无错误 | `npx tsc -b` = 0 errors | ✅ PASS |
| R-03 | ESLint 变更文件无错误 | `npx eslint Editor.tsx EditorTableBackspace.test.ts EditorNbspSanitize.test.ts` = 0 errors | ✅ PASS |
| R-04 | Bug: Backspace 无法删除表格 | 修复 commit 6af0210, 使用 `$pos.nodeBefore` API | ✅ FIXED |
| R-05 | Bug: 表格内偶现 &nbsp; | 修复 commit 6af0210, `onUpdate` 添加 `\xA0` 规范化 | ✅ FIXED |
| R-06 | 工具栏命令回归 | 源码标记测试 EditorStyles.test.ts 全部通过 | ✅ PASS |
| R-07 | 查找替换回归 | 源码标记测试 EditorFindReplace.test.ts 全部通过 | ✅ PASS |
| R-08 | 表格控件回归 | 源码标记测试 EditorTableControls.test.ts 全部通过 | ✅ PASS |
| R-09 | 图片粘贴回归 | 源码标记测试 useImagePaste.test.ts (14 cases) 全部通过 | ✅ PASS |
| R-10 | Markdown 序列化回归 | MarkdownService.test.ts (8 cases) 全部通过 | ✅ PASS |
| R-11 | 工作区管理回归 | WorkspaceManager.test.ts 全部通过 | ✅ PASS |
| R-12 | 文件树路径回归 | pathing.test.ts 全部通过 | ✅ PASS |
| R-13 | 文件树搜索回归 | SidebarSearch.test.ts 全部通过 | ✅ PASS |
| R-14 | 关窗工作流回归 | closeWorkflow.test.ts 全部通过 | ✅ PASS |
| R-15 | 状态 Store 验证回归 | verification.test.ts 全部通过 | ✅ PASS |

### S3-V3-02：证据模板标准化与归档一致性检查

| 检查项 | 结果 |
| ---- | ---- |
| `当前Bug统计.md` 已更新为含修复根因与证据 | ✅ |
| V3 看板已更新为 Sprint3 已完成 | ✅ |
| 新增测试文件 `EditorNbspSanitize.test.ts` 已归入源码 | ✅ |
| `EditorTableBackspace.test.ts` 已同步更新匹配新逻辑 | ✅ |

## 3. 遗留项

| 项 | 状态 | 处置 |
| ---- | ---- | ---- |
| Tauri 原生调用补测 | 阻塞 | Web 模式无法覆盖，需桌面环境。已留档于 `当前Bug统计.md`。不构成 V3 发布阻断。 |
| 全项目 CRLF 行尾不一致 | 低优 | `.prettierrc` 缺少 `endOfLine` 设置，建议 V4 统一修复。 |

## 4. DoD

1. ✅ S3-V3-01 高风险回归最小集：15/15 项通过
2. ✅ S3-V3-02 证据标准化：4/4 检查通过
3. ✅ P0/P1 缺陷已清零
4. ✅ 遗留 Tauri 补测阻塞已留档，不阻断发布
