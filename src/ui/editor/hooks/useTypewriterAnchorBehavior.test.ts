import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('useTypewriterAnchor behavior contract', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const hookTs = readFileSync(
    join(currentDir, 'useTypewriterAnchor.ts'),
    'utf-8',
  );

  it('uses requestAnimationFrame batching and composition guards', () => {
    expect(hookTs).toContain('window.requestAnimationFrame');
    expect(hookTs).toContain("editorDom?.addEventListener('compositionstart'");
    expect(hookTs).toContain("editorDom?.addEventListener('compositionend'");
    expect(hookTs).toContain('if (isComposing)');
    expect(hookTs).toContain('lastTypingUpdateAtMs = Date.now();');
    expect(hookTs).toContain("scheduleAnchorUpdate('typing')");
  });

  it('reads runtime top offset css variable from scroll container', () => {
    expect(hookTs).toContain('resolveEditorContentTopOffset');
    expect(hookTs).toContain('effectiveViewportHeight');
    expect(hookTs).toContain('findScrollContainer');
    expect(hookTs).toContain('setScrollTop');
  });
});
