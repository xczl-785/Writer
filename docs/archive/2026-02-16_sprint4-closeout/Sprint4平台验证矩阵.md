# Sprint 4 平台验证矩阵（macOS / Windows）

## 1. 说明

- 验证目标：确保 V1 Must 12 在 macOS 与 Windows 上关键路径可用。
- 证据目录：
  - macOS: `docs/archive/evidence/2026-02-16/platform-macos/`
  - Windows: `docs/archive/evidence/2026-02-16/platform-windows/`

## 2. 验证项

| 项目             | macOS | Windows | 说明                       |
| ---------------- | ----- | ------- | -------------------------- |
| 启动与可编辑     | PASS  | BLOCKED | 冷启动后进入可编辑态       |
| 打开工作区       | PASS  | BLOCKED | 读取目录树并可切换文件     |
| 新建/重命名/删除 | PASS  | BLOCKED | 文件树与磁盘一致           |
| 编辑与自动保存   | PASS  | BLOCKED | 防抖、失焦、关闭前保存生效 |
| 图片粘贴与显示   | PASS  | BLOCKED | 落盘、引用、渲染链路完整   |
| 撤销/重做        | PASS  | BLOCKED | 快捷键行为平台等价         |
| 错误可见性       | PASS  | BLOCKED | 状态栏可见，不静默失败     |
| 原子写安全性     | PASS  | BLOCKED | 失败不破坏原文件           |

## 3. 平台差异记录

| 编号     | 差异描述                      | 影响范围             | 处理方式                   | 结论 |
| -------- | ----------------------------- | -------------------- | -------------------------- | ---- |
| PDIFF-01 | 当前周期暂无 Windows 执行环境 | Windows 全量平台验证 | 暂标记 BLOCKED，下一轮补测 | 待补 |

## 4. 结论

- macOS: 关键路径已通过。
- Windows: 暂无环境，当前标记为 BLOCKED。
- 综合结论: V1 功能回归可通过，但发布签收前需补齐 Windows 平台验证。
