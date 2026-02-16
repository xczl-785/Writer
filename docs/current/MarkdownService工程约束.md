# MarkdownService 工程落地约束

## 1. 文档目的

将 D-007 Spike 的选型结论转化为 S1-05 可直接执行的工程约束，避免开发者重复调研。

## 2. 选型结论（已验证，来源：D-007）

| 项目        | 选型                        | 版本      |
| --------- | ------------------------- | ------- |
| 核心包       | `@tiptap/markdown`        | ^3.19.0 |
| Parser 引擎 | MarkedJS（CommonMark 合规）   | 内置      |
| 基础扩展      | `@tiptap/starter-kit`     | ^3.19.0 |
| 图片扩展      | `@tiptap/extension-image` | ^3.19.0 |


**参考实现**：`spike/roundtrip/roundtrip.test.ts`

## 3. 工程推荐配置

```ts
import { MarkdownManager } from '@tiptap/markdown';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';

// MarkdownService 核心实例（全局单例）
const manager = new MarkdownManager({
  extensions: [StarterKit, Image],
});

// MarkdownService 接口实现
export const MarkdownService = {
  parse: (md: string) => manager.parse(md),
  serialize: (doc: unknown) => manager.serialize(doc),
};
```

> 注意：`MarkdownManager` 的 extensions 列表必须与 TipTap Editor 实例的 extensions **保持一致**，否则会出现 parse/serialize 不对称。

## 4. V1 扩展清单（冻结）

以下为 Sprint 1 必须注册的扩展，直接对应 Must-12 功能：

| 扩展         | 来源                      | 覆盖 Must 项                                                                                               |
| ------------ | ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `StarterKit` | `@tiptap/starter-kit`     | FR-01~04, FR-07（含 Heading, Bold, Italic, Code, CodeBlock, BulletList, OrderedList, Blockquote, History） |
| `Image`      | `@tiptap/extension-image` | FR-05（Sprint 2/3 时使用）                                                                                 |

**不得在 Sprint 1 引入其他扩展**。后续扩展需走变更评估。

## 5. 已知空白差异（已接受）

D-007 Spike 验证通过时记录了以下差异，均为**语义无损**，已被接受：

| 用例         | 差异                       | 影响       |
| ------------ | -------------------------- | ---------- |
| 所有用例     | 末尾换行符被省略           | 无语义影响 |
| nested lists | 不同类型列表间自动插入空行 | 无语义影响 |

**处理策略**：不做特殊处理。Roundtrip 断言使用 `mustContain` 语义检查而非逐字符比对。

## 6. 已知限制与 V1 处置

| 限制                                                | 来源                      | V1 处置                                            |
| --------------------------------------------------- | ------------------------- | -------------------------------------------------- |
| **表格**：每个单元格仅支持单子节点                  | @tiptap/markdown 官方文档 | V1 不含表格（已在 Scope Freeze 中排除），不影响    |
| **重叠格式**：加粗+斜体同段可能产生非法语法         | GitHub issue              | 在 S1-06 中观察，若复现则登记缺陷，不阻塞 Sprint 1 |
| **注释丢失**：HTML 注释在 parse 后丢失              | 官方文档                  | V1 不支持 HTML 注释编辑，不影响                    |
| **早期版本**：@tiptap/markdown 标注为 early release | 官方文档                  | 已通过 D-007 门禁验证核心路径，可接受风险          |

## 7. Fallback 策略

若在开发过程中发现 `@tiptap/markdown` 无法满足核心需求：

1. **第一级 fallback**：为特定语法编写自定义 tokenizer（官方支持 `createBlockMarkdownSpec` / `createInlineMarkdownSpec`）。
2. **第二级 fallback**：替换 serialize 层为 `prosemirror-markdown` 的 `MarkdownSerializer`，保留 parse 层不变。
3. **第三级 fallback**：启动备选内核评估流程（见 `工程蓝图.md` §9 D-007 失败处理）。

> 第一、二级 fallback 可在 Sprint 内执行；第三级需触发 Step D 回退评估，暂停当前 Sprint。

## 8. 回归要求

S1-05 完成后，必须通过以下回归：

1. `spike/roundtrip/roundtrip.test.ts` 中的 4 组用例全部通过。
2. 新增用例：引用块（blockquote）roundtrip 通过。
3. 输出 Markdown 可被 `MarkdownManager.parse` 再次解析且语义不变（双 roundtrip）。
