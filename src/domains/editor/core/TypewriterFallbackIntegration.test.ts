import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Typewriter fallback integration', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const hookTs = readFileSync(
    join(currentDir, 'hooks', 'useTypewriterAnchor.ts'),
    'utf-8',
  );
  const findTs = readFileSync(join(currentDir, 'useFindReplace.ts'), 'utf-8');
  const outlineExtractorTs = readFileSync(
    join(currentDir, '..', 'components', 'Outline', 'useOutlineExtractor.ts'),
    'utf-8',
  );

  it('forces free mode on editor click caret placement', () => {
    expect(hookTs).toContain("editorDom?.addEventListener('mousedown'");
    expect(hookTs).toContain("document.addEventListener('selectionchange'");
    expect(hookTs).toContain('shouldForceFreeOnMouseCaretPlacement');
    expect(hookTs).toContain(
      'typewriterState = createInitialTypewriterState()',
    );
  });

  it('forces free mode for find navigation and outline jumps', () => {
    expect(findTs).toContain("emitTypewriterForceFree('find-navigation')");
    expect(outlineExtractorTs).toContain(
      "emitTypewriterForceFree('outline-navigation')",
    );
  });
});
