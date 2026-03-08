import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('useTypewriterAnchor phase3 contract', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const hookTs = readFileSync(
    join(currentDir, 'useTypewriterAnchor.ts'),
    'utf-8',
  );

  it('uses controlled compensation animation instead of browser smooth mode', () => {
    expect(hookTs).toContain(
      'const TYPEWRITER_COMPENSATION_ANIMATION_MS = 140;',
    );
    expect(hookTs).toContain('window.requestAnimationFrame(animateStep)');
    expect(hookTs).toContain('window.performance.now()');
  });

  it('degrades to free mode when locked path would compensate upward', () => {
    expect(hookTs).toContain('shouldDowngradeLockedModeForUpwardCompensation');
    expect(hookTs).toContain(
      'shouldDowngradeLockedStateForExternalUpwardCompensation',
    );
    expect(hookTs).toContain("lastAnchorUpdateTriggerSource = 'external'");
    expect(hookTs).toContain("typewriterState.mode === 'free'");
    expect(hookTs).toContain('return;');
  });
});
