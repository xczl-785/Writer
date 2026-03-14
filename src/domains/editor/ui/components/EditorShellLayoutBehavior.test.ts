import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('EditorShell layout behavior', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const shellTsx = readFileSync(join(currentDir, 'EditorShell.tsx'), 'utf-8');
  const editorCss = readFileSync(join(currentDir, '..', 'Editor.css'), 'utf-8');

  it('keeps find panel in normal flow ahead of editor content', () => {
    const findPanelIndex = shellTsx.indexOf('{findReplacePanel}');
    const editorContentIndex = shellTsx.indexOf('<EditorContent');
    expect(findPanelIndex).toBeGreaterThan(-1);
    expect(editorContentIndex).toBeGreaterThan(-1);
    expect(findPanelIndex).toBeLessThan(editorContentIndex);
    expect(shellTsx).toContain('className="editor-find-panel-host"');
  });

  it('uses scrolling on content area container instead of overlay offsets', () => {
    expect(shellTsx).toContain('className="editor-content-area"');
    expect(editorCss).toContain('.editor-content-area {');
    expect(editorCss).toContain('overflow: auto;');
  });

  it('maintains explicit top offset variable with runtime measurement chain', () => {
    expect(shellTsx).toContain('ResizeObserver');
    expect(shellTsx).toContain("'--editor-content-offset-top'");
    expect(shellTsx).toContain("root.querySelector('.editor-find-panel')");
    expect(editorCss).toContain('--editor-content-offset-top: 0px;');
    expect(editorCss).toContain('--editor-content-padding-top-effective');
  });
});
