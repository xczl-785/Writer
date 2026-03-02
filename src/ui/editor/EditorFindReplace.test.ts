import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Editor find and replace', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const readEditor = () =>
    readFileSync(join(currentDir, 'Editor.tsx'), 'utf-8');
  const readPanel = () =>
    readFileSync(
      join(currentDir, 'components', 'FindReplacePanel.tsx'),
      'utf-8',
    );
  const readConstants = () =>
    readFileSync(join(currentDir, 'constants.ts'), 'utf-8');

  it('includes source markers for find-replace keyboard shortcuts', () => {
    const editorTsx = readEditor();

    expect(editorTsx).toContain("'Mod-f'");
    expect(editorTsx).toContain("'Mod-h'");
  });

  it('includes source markers for find-replace accessible labels', () => {
    const panelTsx = readPanel();

    expect(panelTsx).toContain("t('dialog.find')");
    expect(panelTsx).toContain("t('dialog.replace')");
    expect(panelTsx).toContain("t('dialog.prev')");
    expect(panelTsx).toContain("t('dialog.next')");
    expect(panelTsx).toContain("t('dialog.replace')");
    expect(panelTsx).toContain("t('dialog.replaceAll')");
  });

  it('includes source markers for find-replace status and count strings', () => {
    const editorTsx = readEditor();
    const panelTsx = readPanel();

    expect(editorTsx).toContain("'No matches'");
    expect(editorTsx).toContain("'Enter text to find'");
    expect(panelTsx).toContain('aria-label="Match count"');
    expect(panelTsx).toContain('aria-label="Match progress"');
    const constantsTs = readConstants();
    expect(constantsTs).toContain(
      'FIND_MATCH_LIMIT = EDITOR_CONFIG.findReplace.maxMatches',
    );
    expect(editorTsx).toContain('`> ${FIND_MATCH_LIMIT - 1} matches`');
  });
});
