import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('EditorDropBlockedOverlay', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(
    join(currentDir, 'EditorDropBlockedOverlay.tsx'),
    'utf-8',
  );
  const appCss = readFileSync(
    join(currentDir, '..', '..', '..', 'app', 'App.css'),
    'utf-8',
  );

  it('renders the redirected drop hint from the v6 windows prototype', () => {
    expect(source).toContain('ArrowLeft');
    expect(source).toContain('isVisible');
    expect(source).toContain("t('workspace.dropInEditorDisabled')");
    expect(source).toContain('rounded-full bg-zinc-800 text-white');
    expect(source).toContain('bg-white/80');
    expect(source).toContain('backdrop-blur-md');
    expect(source).toContain('editor-drop-blocked-overlay__arrow');
    expect(source).toContain('opacity-0');
    expect(source).toContain('opacity-100');
    expect(appCss).toContain('.editor-drop-blocked-overlay__arrow');
    expect(appCss).toContain('@keyframes editor-drop-blocked-arrow');
    expect(appCss).toContain(
      'animation: editor-drop-blocked-arrow 1.5s infinite;',
    );
    expect(appCss).toContain('0%,');
    expect(appCss).toContain('100% {');
    expect(appCss).toContain('transform: translateX(0);');
    expect(appCss).toContain('50% {');
    expect(appCss).toContain('transform: translateX(-15px);');
  });
});
