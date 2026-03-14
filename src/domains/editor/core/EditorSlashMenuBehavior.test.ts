import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Editor slash menu behavior', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const readSlashMenu = () =>
    readFileSync(join(currentDir, 'menus', 'SlashMenu.tsx'), 'utf-8');
  const readUseSlashMenu = () =>
    readFileSync(join(currentDir, 'menus', 'useSlashMenu.ts'), 'utf-8');
  const readSlashEligibility = () =>
    readFileSync(join(currentDir, 'menus', 'slashEligibility.ts'), 'utf-8');
  const readSlashDomain = () =>
    readFileSync(
      join(currentDir, 'domain', 'slash', 'slashDomain.ts'),
      'utf-8',
    );
  const readSafeCoords = () =>
    readFileSync(join(currentDir, 'hooks', 'useSafeCoords.ts'), 'utf-8');
  const readGhostHintHook = () =>
    readFileSync(join(currentDir, 'hooks', 'useGhostHint.ts'), 'utf-8');
  const readGhostHint = () =>
    readFileSync(join(currentDir, 'menus', 'GhostHint.tsx'), 'utf-8');
  const readEditorImpl = () =>
    readFileSync(join(currentDir, 'EditorImpl.tsx'), 'utf-8');
  const readMessages = () =>
    readFileSync(join(currentDir, '../../i18n/messages.ts'), 'utf-8');

  it('supports slash trigger chars for Latin and full-width input', () => {
    const slashDomainTs = readSlashDomain();
    expect(slashDomainTs).toContain("value === '/'");
    expect(slashDomainTs).toContain("value === '／'");
  });

  it('enforces strict slash trigger eligibility for top-level empty paragraph only', () => {
    const slashEligibilityTs = readSlashEligibility();
    expect(slashEligibilityTs).toContain('isStrictSlashTriggerEligible');
    expect(slashEligibilityTs).toContain('$from.depth !== 1');
    expect(slashEligibilityTs).toContain(
      "$from.parent.type.name !== 'paragraph'",
    );
    expect(slashEligibilityTs).toContain('$from.parent.content.size === 0');
  });

  it('reuses strict eligibility in slash menu and ghost hint', () => {
    const useSlashMenuTs = readUseSlashMenu();
    const ghostHintTs = readGhostHintHook();
    expect(useSlashMenuTs).toContain('isStrictSlashTriggerEligible');
    expect(ghostHintTs).toContain('isStrictSlashTriggerEligible');
  });

  it('recomputes ghost hint position on scroll to avoid fixed overlay drift', () => {
    const ghostHintTs = readGhostHintHook();
    expect(ghostHintTs).toContain('window.requestAnimationFrame');
    expect(ghostHintTs).toContain("addEventListener('scroll'");
  });

  it('renders localized ghost hint copy with styled slash token', () => {
    const ghostHintTsx = readGhostHint();
    const messagesTs = readMessages();
    expect(ghostHintTsx).toContain("t('ghostHint.prefix')");
    expect(ghostHintTsx).toContain("t('ghostHint.suffix')");
    expect(ghostHintTsx).toContain('editor-ghost-slash__trigger');
    expect(messagesTs).toContain("'ghostHint.prefix'");
    expect(messagesTs).toContain("'ghostHint.suffix'");
  });

  it('handles beforeinput and compositionend for IME-safe slash flow', () => {
    const useSlashMenuTs = readUseSlashMenu();
    const slashDomainTs = readSlashDomain();
    expect(useSlashMenuTs).toContain("addEventListener('beforeinput'");
    expect(useSlashMenuTs).toContain("addEventListener('compositionstart'");
    expect(useSlashMenuTs).toContain("addEventListener('compositionend'");
    expect(useSlashMenuTs).toContain('const handleCompositionEnd');
    expect(slashDomainTs).toContain("inputType === 'insertFromComposition'");
    expect(useSlashMenuTs).toContain(
      'if (event.isComposing || composingRef.current)',
    );
  });

  it('cleans committed slash char before opening menu in IME path', () => {
    const useSlashMenuTs = readUseSlashMenu();
    expect(useSlashMenuTs).toContain('triggeredByCommittedChar');
    expect(useSlashMenuTs).toContain('.deleteRange({ from: selection.from - 1');
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

  it('uses SlashMenuView + SlashInlineView in editor composition', () => {
    const editorImplTsx = readEditorImpl();
    expect(editorImplTsx).toContain('<SlashMenuView');
    expect(editorImplTsx).toContain('<SlashInlineView');
    expect(editorImplTsx).not.toContain('<SlashMenu ');
    expect(editorImplTsx).not.toContain('<SlashInline ');
  });

  it('supports hover selection and blur close in slash session handling', () => {
    const useSlashMenuTs = readUseSlashMenu();
    expect(useSlashMenuTs).toContain("dispatch({ type: 'SET_SELECTED'");
    expect(useSlashMenuTs).toContain("editor.on('blur', handleBlur)");
    expect(useSlashMenuTs).toContain("editor.off('blur', handleBlur)");
  });

  it('keeps slash inline query vertically aligned to anchor top', () => {
    const slashMenuViewTsx = readFileSync(
      join(currentDir, 'menus', 'SlashMenuView.tsx'),
      'utf-8',
    );
    expect(slashMenuViewTsx).toContain('top: anchorRect.top - 1');
    expect(slashMenuViewTsx).not.toContain('top: anchorRect.top + 2');
  });

  it('does not append query from compositionend to avoid IME duplicate text', () => {
    const useSlashMenuTs = readUseSlashMenu();
    expect(useSlashMenuTs).not.toContain(
      "if (slashState.phase !== 'idle' && data)",
    );
  });
});
