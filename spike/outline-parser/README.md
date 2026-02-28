# Outline Parser Spike

## 目标

验证超长文档的大纲提取性能，确定是否需要虚拟滚动。

## 验证范围

### 1. 全量遍历性能

- 遍历 TipTap 文档节点
- 提取 H1-H6 标题
- 生成大纲树结构

### 2. 增量更新策略

- 监听文档变更事件
- 仅更新受影响的大纲项
- 防抖处理

### 3. 虚拟滚动必要性

- 大纲项数量阈值评估
- 渲染性能测试
- 内存占用测试

## 技术方案

### 方案 A: 全量遍历 + 防抖更新

```typescript
function extractOutline(editor: Editor): OutlineItem[] {
  const items: OutlineItem[] = [];
  const doc = editor.state.doc;

  doc.descendants((node, pos) => {
    if (node.type.name === 'heading') {
      items.push({
        id: `h-${pos}`,
        level: node.attrs.level,
        text: node.textContent,
        position: pos,
      });
    }
  });

  return items;
}

// 防抖更新
const debouncedUpdate = debounce(() => {
  setOutlineItems(extractOutline(editor));
}, 150);
```

### 方案 B: 增量更新 + 变更追踪

```typescript
// 仅在标题节点变更时重新计算
editor.on('update', ({ transaction }) => {
  let needsUpdate = false;

  transaction.steps.forEach((step) => {
    // 检查是否影响标题节点
    if (affectsHeadings(step)) {
      needsUpdate = true;
    }
  });

  if (needsUpdate) {
    updateOutline();
  }
});
```

### 方案 C: 虚拟滚动 (tanstack/virtual)

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

function OutlinePanel({ items }: { items: OutlineItem[] }) {
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28, // 每项高度
    overscan: 5,
  });

  // 仅渲染可见项
}
```

## 性能基准

| 文档行数 | 大纲项数 | 全量遍历目标 | 内存增量目标 |
| -------- | -------- | ------------ | ------------ |
| 1,000    | ~50      | < 10ms       | < 1MB        |
| 5,000    | ~200     | < 50ms       | < 2MB        |
| 10,000   | ~500     | < 100ms      | < 5MB        |
| 50,000   | ~2000    | < 500ms      | < 10MB       |

## 验证用例

| 用例             | 输入          | 预期结果           |
| ---------------- | ------------- | ------------------ |
| 小文档大纲提取   | 500 行文档    | < 10ms             |
| 中等文档大纲提取 | 5000 行文档   | < 100ms            |
| 大文档大纲提取   | 10000+ 行文档 | < 500ms            |
| 快速编辑更新     | 连续输入      | 防抖正常工作       |
| 大纲点击跳转     | 点击大纲项    | 正确定位到文档位置 |

## 运行方式

```bash
cd spike/outline-parser
npm install
npm run benchmark
```

## 判定规则

- ✅ 5000 行文档全量遍历 < 100ms
- ✅ 编辑时防抖更新流畅
- ✅ 内存占用合理
- ⚠️ 如果 > 5000 行性能不达标，需启用虚拟滚动
- ❌ 核心功能不可用判定为不通过

## 输出产物

1. `spike/outline-parser/src/` — 验证代码
2. `spike/outline-parser/SPIKE_REPORT.md` — 性能数据报告
3. 技术方案推荐 (是否需要虚拟滚动)
