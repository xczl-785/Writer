import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('BlockBoundary visuals', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const extensionSrc = readFileSync(
    join(currentDir, 'blockBoundaryExtension.ts'),
    'utf-8',
  );
  const cssSrc = readFileSync(join(currentDir, 'blockBoundary.css'), 'utf-8');

  it('enables code block and quote boundary by default', () => {
    expect(extensionSrc).toContain('showCodeBlock: true');
    expect(extensionSrc).toContain('showBlockquote: true');
    expect(extensionSrc).toContain('showList: false');
  });

  it('defines expected boundary styles and reveal timing', () => {
    expect(cssSrc).toContain('.block-boundary-code');
    expect(cssSrc).toContain('.block-boundary-quote');
    expect(cssSrc).toContain('box-shadow: 0 0 0 1px');
    expect(cssSrc).toContain('box-shadow: none;');
    expect(cssSrc).toContain('background: rgb(59 130 246 / 6%);');
    expect(cssSrc).toContain('background: rgb(161 161 170 / 10%);');
    expect(cssSrc).toContain('transition: box-shadow 50ms ease-out;');
  });
});
