import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('window capability spec', () => {
  const source = readFileSync(
    join(process.cwd(), 'src-tauri', 'capabilities', 'default.json'),
    'utf-8',
  );

  it('allows custom chrome window controls and dragging', () => {
    expect(source).toContain('core:window:allow-close');
    expect(source).toContain('core:window:allow-minimize');
    expect(source).toContain('core:window:allow-toggle-maximize');
    expect(source).toContain('core:window:allow-start-dragging');
  });
});
