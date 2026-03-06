# 编辑区三间距需求归档（2026-03-06）

## 归档范围

- `REQ-EDITOR-TOP-GAP`（顶部间距）
- `REQ-EDITOR-INLINE-GAP`（左右间距）
- `REQ-EDITOR-BOTTOM-GAP`（底部留白）

对应文档已从 `docs/current/交互/需求/` 迁移至本目录 `需求/` 子目录。

## 实现结果

- 间距模型统一入口：`src/ui/editor/core/EditorLayoutModel.ts`（结合 `EditorSpacingSpec`）
- 样式变量统一消费：`src/ui/editor/Editor.css`
- 底部贴边根因修复：`src/ui/editor/EditorImpl.tsx`（移除 ProseMirror `h-full`）
- 顶部 Find 场景补充显式 offset 变量链路（Find-only）：`EditorShell + useTypewriterAnchor`

## 验证与证据

- 自动化验证：见 `docs/current/交互/实施验收清单.md` 第 5、6 节
- 遗留闭环：
  - `L-A-01`（TC-A08）已关闭
  - `G-04`（布局层级联动）已关闭

## 后续衔接

- 打字机专项仍在进行中：`docs/current/交互/需求/REQ-EDITOR-TYPEWRITER.md`
- 中文输入前两字符轻微跳动已记录为待修复问题：`当前Bug统计.md`
