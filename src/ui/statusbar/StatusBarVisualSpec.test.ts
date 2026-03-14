import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('StatusBar visual spec', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const statusCss = readFileSync(join(currentDir, 'StatusBar.css'), 'utf-8');
  const indexCss = readFileSync(
    join(currentDir, '..', '..', 'index.css'),
    'utf-8',
  );

  it('uses hairline token and dpr>=2 override', () => {
    expect(statusCss).toContain('border-top: var(--hairline-width) solid');
    expect(indexCss).toContain('--hairline-width: 1px;');
    expect(indexCss).toContain('@media (resolution >= 2dppx)');
    expect(indexCss).toContain('--hairline-width: 0.5px;');
  });

  it('matches status indicator timing and opacity spec', () => {
    expect(statusCss).toContain('.status-bar.saved .status-indicator');
    expect(statusCss).toContain('opacity: 0.3;');
    expect(statusCss).toContain('.status-bar.dirty .status-indicator');
    expect(statusCss).toContain('background-color: var(--color-warning);');
    expect(statusCss).toContain('animation: pulse 2s infinite;');
  });
});
