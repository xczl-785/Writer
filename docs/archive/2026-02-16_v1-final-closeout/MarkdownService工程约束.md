# MarkdownService 工程落地约束

## 1. 文档目的

将 D-007 Spike 的选型结论转化为 S1-05 可直接执行的工程约束，避免开发者重复调研。

## 2. 选型结论（已验证，来源：D-007）

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

**不得在 Sprint 1 引入其他扩展**。后续扩展需走变更评估。

## 5. 已知空白差异（已接受）

D-007 Spike 验证通过时记录了以下差异，均为**语义无损**，已被接受：

**处理策略**：不做特殊处理。Roundtrip 断言使用 `mustContain` 语义检查而非逐字符比对。

## 6. 已知限制与 V1 处置

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

&nbsp;