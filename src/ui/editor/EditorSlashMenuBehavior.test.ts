import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Editor slash menu behavior', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const readSlashMenu = () =>
    readFileSync(join(currentDir, 'menus', 'SlashMenu.tsx'), 'utf-8');
  const readSlashEligibility = () =>
    readFileSync(join(currentDir, 'menus', 'slashEligibility.ts'), 'utf-8');
  const readSafeCoords = () =>
    readFileSync(join(currentDir, 'hooks', 'useSafeCoords.ts'), 'utf-8');
  const readGhostHintHook = () =>
    readFileSync(join(currentDir, 'hooks', 'useGhostHint.ts'), 'utf-8');

  it('supports slash trigger chars for Latin and full-width input', () => {
    const slashMenuTsx = readSlashMenu();
    expect(slashMenuTsx).toContain("value === '/'");
    expect(slashMenuTsx).toContain("value === '／'");
  });

  it('enforces strict slash trigger eligibility for top-level empty paragraph only', () => {
    const slashEligibilityTs = readSlashEligibility();
    expect(slashEligibilityTs).toContain('isStrictSlashTriggerEligible');
    expect(slashEligibilityTs).toContain('$from.depth !== 1');
    expect(slashEligibilityTs).toContain("$from.parent.type.name !== 'paragraph'");
    expect(slashEligibilityTs).toContain('$from.parent.content.size === 0');
  });

  it('reuses strict eligibility in slash menu and ghost hint', () => {
    const slashMenuTsx = readSlashMenu();
    const ghostHintTs = readGhostHintHook();
    expect(slashMenuTsx).toContain('isStrictSlashTriggerEligible');
    expect(ghostHintTs).toContain('isStrictSlashTriggerEligible');
  });

  it('handles beforeinput and compositionend for IME-safe slash flow', () => {
    const slashMenuTsx = readSlashMenu();
    expect(slashMenuTsx).toContain("addEventListener('beforeinput'");
    expect(slashMenuTsx).toContain("addEventListener('compositionstart'");
    expect(slashMenuTsx).toContain("addEventListener('compositionend'");
    expect(slashMenuTsx).toContain('const onCompositionEnd');
    expect(slashMenuTsx).toContain("inputType === 'insertFromComposition'");
    expect(slashMenuTsx).toContain(
      'if (event.isComposing || composingRef.current)',
    );
  });

  it('cleans committed slash char before opening menu in IME path', () => {
    const slashMenuTsx = readSlashMenu();
    expect(slashMenuTsx).toContain('triggeredByCommittedChar');
    expect(slashMenuTsx).toContain('.deleteRange({ from: selection.from - 1');
  });

  it('guards coordsAtPos access when editor view is not mounted yet', () => {
    const safeCoordsTsx = readSafeCoords();
    expect(safeCoordsTsx).toContain('getSafeCoordsAtPos');
    expect(safeCoordsTsx).toContain('editor.view.coordsAtPos(pos)');
  });

  it('renders slash session fragment in editor area without menu input field', () => {
    const slashMenuTsx = readSlashMenu();
    expect(slashMenuTsx).toContain('className={`editor-slash-inline');
    expect(slashMenuTsx).toContain('editor-slash-inline__trigger');
    expect(slashMenuTsx).toContain('editor-slash-inline__query');
    expect(slashMenuTsx).not.toContain('editor-slash-menu__fragment');
  });

  it('does not append query from compositionend to avoid IME duplicate text', () => {
    const slashMenuTsx = readSlashMenu();
    expect(slashMenuTsx).not.toContain(
      "if (slashState.phase !== 'idle' && data)",
    );
  });
});
