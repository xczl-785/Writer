# Roundtrip Spike

## 目标

验证 Markdown 与编辑器文档模型往返时的语义保持：
`.md -> parse -> serialize -> .md`

## 覆盖用例

1. 标题（H1-H6）
2. 有序/无序列表与嵌套
3. 围栏代码块（含语言标识）
4. 图片引用（`![alt](path)`）

## 运行方式

```bash
npm install
npm test
```

报告产出：`docs/archive/SPIKE_ROUNDTRIP_REPORT.md`

## 判定规则

- 语义一致即通过（允许空白、换行微差异）
- 任一核心语义丢失判定为不通过
