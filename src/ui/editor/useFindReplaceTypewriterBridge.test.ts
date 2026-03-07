import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('useFindReplace typewriter bridge', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(join(currentDir, 'useFindReplace.ts'), 'utf-8');

  it('emits non-input jump event before find-driven selection jumps', () => {
    expect(source).toContain('emitTypewriterNonInputJump');
    expect(source).toContain("source: 'find-replace'");
    expect(source).toContain('.setTextSelection({ from: match.from, to: match.to })');
  });
});
