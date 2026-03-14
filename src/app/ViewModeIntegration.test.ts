import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('View mode integration', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const appTsx = readFileSync(join(currentDir, 'App.tsx'), 'utf-8');
  const editorTsx = readFileSync(
    join(currentDir, '..', 'domains', 'editor', 'core', 'Editor.tsx'),
    'utf-8',
  );

  it('uses view mode slice to drive zen transitions in app shell', () => {
    expect(appTsx).toContain('useViewModeStore');
    expect(appTsx).toContain('enterZen(');
    expect(appTsx).toContain('exitZen(');
    expect(appTsx).toContain('syncTypewriterFromUserPreference');
  });

  it('passes typewriter-active state into editor component', () => {
    expect(appTsx).toContain('isTypewriterActive={isTypewriterActive}');
    expect(editorTsx).toContain('isTypewriterActive?: boolean');
  });
});
