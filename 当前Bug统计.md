# 当前 Bug 统计

> 最后更新：2026-02-22

## 已修复（V3 Sprint3）

- ~~Backspace 无法删除表格~~ → 已修复（commit 6af0210）
  - 根因：`doc.nodeAt(selection.from - 1)` 在 ProseMirror 位置模型中指向段落开标签，非前驱表格节点
  - 修复：使用 `doc.resolve(beforeBlockPos).nodeBefore` 正确解析前驱兄弟节点
- ~~表格内偶现填充字符"&nbsp;"~~ → 已修复（commit 6af0210）
  - 根因：浏览器在复制粘贴时将空格转换为 `\xA0`，序列化后泄漏为 `&nbsp;` 文本
  - 修复：在 `onUpdate` 序列化路径中添加 `\xA0` → ` ` 规范化

## 待观测

（暂无）

## 已知限制

- Tauri 环境原生调用补测：Web 模式无法覆盖，需 Tauri 桌面环境验证（V3 遗留留档项）