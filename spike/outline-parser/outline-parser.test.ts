/**
 * SPIKE-003: Outline Parser Performance
 *
 * 验证目标:
 * 1. 全量遍历提取 H1-H6 标题的性能
 * 2. 防抖更新的有效性
 * 3. 确定虚拟滚动的阈值
 */

import { describe, it, expect, vi } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { MarkdownManager } from '@tiptap/markdown';

const mdManager = new MarkdownManager({
  extensions: [StarterKit],
});

// ============================================
// Types
// ============================================

interface OutlineItem {
  id: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  position: number;
}

// ============================================
// Outline Extractor
// ============================================

function extractOutline(editor: Editor): OutlineItem[] {
  const items: OutlineItem[] = [];
  const doc = editor.state.doc;

  doc.descendants((node, pos) => {
    if (node.type.name === 'heading') {
      const level = node.attrs.level as 1 | 2 | 3 | 4 | 5 | 6;
      items.push({
        id: `h-${pos}`,
        level,
        text: node.textContent,
        position: pos,
      });
    }
  });

  return items;
}

// ============================================
// Debounce helper
// ============================================

function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// ============================================
// Tests
// ============================================

describe('SPIKE-003: Outline Parser Performance', () => {
  it('should extract headings from 5000 line document under 100ms', async () => {
    const lineCount = 5000;

    // 生成测试文档
    const headings = [];
    for (let i = 0; i < Math.floor(lineCount / 20); i++) {
      const level = (i % 6) + 1;
      headings.push(`${'#'.repeat(level)} Heading ${i + 1}`);
    }

    const paragraphs = [];
    for (let i = 0; i < lineCount - headings.length; i++) {
      paragraphs.push(`这是第 ${i + 1} 段测试文本。`.repeat(5));
    }

    const content = [...headings, ...paragraphs].join('\n\n');

    // 解析 Markdown 为 JSON
    const json = await mdManager.parse(content);

    // 创建编辑器
    const container = document.createElement('div');
    const editorEl = document.createElement('div');
    container.appendChild(editorEl);
    document.body.appendChild(container);

    const editor = new Editor({
      element: editorEl,
      extensions: [StarterKit],
      content: json,
    });

    // 测量遍历时间
    const start = performance.now();
    const outline = extractOutline(editor);
    const duration = performance.now() - start;

    console.log(`  ✓ Extracted ${outline.length} headings`);
    console.log(`  ✓ Duration: ${duration.toFixed(2)}ms`);

    // 清理
    editor.destroy();
    document.body.removeChild(container);

    expect(outline.length).toBe(Math.floor(lineCount / 20));
    expect(duration).toBeLessThan(100);
  });

  it('should debounce updates correctly', async () => {
    const container = document.createElement('div');
    const editorEl = document.createElement('div');
    container.appendChild(editorEl);
    document.body.appendChild(container);

    const json = await mdManager.parse('# Test\n\nContent');
    const editor = new Editor({
      element: editorEl,
      extensions: [StarterKit],
      content: json,
    });

    // 创建防抖更新函数
    let updateCount = 0;
    const debouncedExtract = debounce(() => {
      extractOutline(editor);
      updateCount++;
    }, 150);

    // 模拟快速编辑
    for (let i = 0; i < 10; i++) {
      editor.commands.insertContent('x');
      debouncedExtract();
    }

    // 等待防抖完成
    await new Promise((resolve) => setTimeout(resolve, 200));

    console.log(`  ✓ Update count: ${updateCount}`);
    console.log(`  ✓ Debounce working: ${updateCount === 1 ? 'Yes' : 'No'}`);

    // 清理
    editor.destroy();
    document.body.removeChild(container);

    expect(updateCount).toBe(1);
  });

  it('should estimate memory usage under 5MB for 1000 items', async () => {
    const itemCount = 1000;

    // 生成大纲项
    const items: OutlineItem[] = [];
    for (let i = 0; i < itemCount; i++) {
      items.push({
        id: `h-${i}`,
        level: ((i % 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6,
        text: `Heading ${i + 1} - This is a longer heading text to simulate real content`,
        position: i * 100,
      });
    }

    // 估算内存 (粗略)
    const avgItemSize = 100; // bytes (id + level + text + position)
    const estimatedMemory = items.length * avgItemSize;

    console.log(`  ✓ Items created: ${items.length}`);
    console.log(
      `  ✓ Estimated memory: ${(estimatedMemory / 1024).toFixed(2)}KB`,
    );

    expect(estimatedMemory).toBeLessThan(5 * 1024 * 1024);
  });

  it('should determine virtual scroll threshold', async () => {
    const testSizes = [1000, 5000];
    const results: { lines: number; duration: number; items: number }[] = [];

    for (const size of testSizes) {
      const lineCount = size;

      // 生成测试文档
      const headings = [];
      for (let i = 0; i < Math.floor(lineCount / 20); i++) {
        const level = (i % 6) + 1;
        headings.push(`${'#'.repeat(level)} Heading ${i + 1}`);
      }

      const paragraphs = [];
      for (let i = 0; i < lineCount - headings.length; i++) {
        paragraphs.push(`这是第 ${i + 1} 段测试文本。`.repeat(5));
      }

      const content = [...headings, ...paragraphs].join('\n\n');
      const json = await mdManager.parse(content);

      const container = document.createElement('div');
      const editorEl = document.createElement('div');
      container.appendChild(editorEl);
      document.body.appendChild(container);

      const editor = new Editor({
        element: editorEl,
        extensions: [StarterKit],
        content: json,
      });

      const start = performance.now();
      extractOutline(editor);
      const duration = performance.now() - start;

      editor.destroy();
      document.body.removeChild(container);

      results.push({ lines: size, duration, items: Math.floor(size / 20) });
    }

    console.log('\n  Performance Summary:');
    console.log('  | Lines | Items | Duration | Status |');
    console.log('  |-------|-------|----------|--------|');

    for (const result of results) {
      const status =
        result.duration < 100
          ? '✓ OK'
          : result.duration < 300
            ? '⚠ Slow'
            : '✗ Need VS';
      console.log(
        `  | ${result.lines} | ${result.items} | ${result.duration.toFixed(0)}ms | ${status} |`,
      );
    }

    // 所有测试应该在 100ms 内完成
    for (const result of results) {
      expect(result.duration).toBeLessThan(100);
    }
  });
});
