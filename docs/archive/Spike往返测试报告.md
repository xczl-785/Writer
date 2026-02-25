# SPIKE_ROUNDTRIP_REPORT

## 元信息

- 日期：2026-02-14
- 执行人：Atlas Orchestrator
- 分支：main

## 执行环境

- OS：macOS (darwin)
- Node/Runtime：Node.js v25.4.0
- 相关依赖版本：
  - @tiptap/core: ^3.19.0
  - @tiptap/markdown: ^3.19.0
  - @tiptap/starter-kit: ^3.19.0
  - @tiptap/extension-image: ^3.19.0

## 用例结果

| 用例         | 结果 | 备注               |
| ------------ | ---- | ------------------ |
| headings     | 通过 | H1-H6 语义保持     |
| nested lists | 通过 | 无序列表和嵌套正确 |
| fenced code  | 通过 | 语言标识正确保留   |
| image ref    | 通过 | alt 和路径正确保留 |

## 结论

- 总结：4 类用例全部通过语义一致性验证。使用 @tiptap/markdown (v3) + StarterKit + Image 扩展可以实现 Markdown 与 TipTap 编辑器模型的双向转换。
- 是否通过 D-007 门禁：**是**

## 差异记录

- 所有用例均无语义丢失，输入输出语义保持一致。
- 允许的空白差异：
  - headings: 输入 `### H3\n` -> 输出 `### H3`（末尾换行符省略）
  - nested lists: 输入 `- a\n  - b\n1. one\n2. two\n` -> 输出 `- a\n  - b\n\n1. one\n2. two`（列表间额外换行）
  - fenced code: 输入 `\`\`\`ts\n...\`\`\`\n`-> 输出`\`\`\`ts\n...\n\`\`\``（末尾换行符省略）
  - image ref: 输入 `![alt](...)\n` -> 输出 `![alt](...)`（末尾换行符省略）

## 运行命令

```bash
npm install
npm test
```
