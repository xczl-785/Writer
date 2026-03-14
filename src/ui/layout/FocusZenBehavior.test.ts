import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('focus zen behavior wiring', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const appTsx = readFileSync(
    join(currentDir, '..', '..', 'app', 'App.tsx'),
    'utf-8',
  );
  const editorTsx = readFileSync(
    join(currentDir, '..', '..', 'domains', 'editor', 'core', 'Editor.tsx'),
    'utf-8',
  );
  const focusZenDomainTs = readFileSync(
    join(
      currentDir,
      '..',
      '..',
      'domains',
      'editor',
      'domain',
      'focusZen',
      'focusZenEscapeDomain.ts',
    ),
    'utf-8',
  );
  const shellTsx = readFileSync(
    join(currentDir, '..', '..', 'domains', 'editor', 'ui', 'components', 'EditorShell.tsx'),
    'utf-8',
  );
  const statusTsx = readFileSync(
    join(currentDir, '..', 'statusbar', 'StatusBar.tsx'),
    'utf-8',
  );
  const editorCss = readFileSync(
    join(currentDir, '..', '..', 'domains', 'editor', 'core', 'Editor.css'),
    'utf-8',
  );
  const statusCss = readFileSync(
    join(currentDir, '..', 'statusbar', 'StatusBar.css'),
    'utf-8',
  );

  it('uses wakeup hook and propagates focus zen visibility into editor/statusbar', () => {
    expect(appTsx).toContain('useFocusZenWakeup');
    expect(appTsx).toContain('isFocusZen');
    expect(appTsx).toContain('isHeaderAwake');
    expect(appTsx).toContain('isFooterAwake');
    expect(statusTsx).toContain('isFocusZen');
    expect(statusTsx).toContain('isVisibleInFocusZen');
  });

  it('wires escape and double-click exit logic with transient overlay guard', () => {
    expect(editorTsx).toContain('onDoubleClick');
    expect(editorTsx).toContain('hasTransientOverlay');
    expect(editorTsx).toContain('hasActiveOverlayInDom');
    expect(focusZenDomainTs).toContain('.editor-find-panel');
    expect(editorTsx).toContain("if (event.key !== 'Escape')");
    expect(editorTsx).toContain(
      'if (hasTransientOverlay || hasActiveOverlayInDom(event.target)) return',
    );
    expect(editorTsx).toContain(
      "window.addEventListener('keydown', onKeyDown, true)",
    );
  });

  it('defines focus zen hide/reveal classes with 200ms transition', () => {
    expect(shellTsx).toContain('editor-header--focus-zen-hidden');
    expect(editorCss).toContain('.editor-header--focus-zen-hidden');
    expect(editorCss).toContain('transition: opacity 0.2s ease');
    expect(statusCss).toContain('.status-bar--focus-zen-hidden');
  });
});
