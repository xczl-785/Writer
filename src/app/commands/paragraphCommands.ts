/**
 * Paragraph menu commands
 *
 * Handles paragraph-level operations like headings, lists, blockquotes, tables.
 */
import { menuCommandBus } from '../../ui/commands/menuCommandBus';
import { useStatusStore } from '../../state/slices/statusSlice';
import { t } from '../../i18n';

export type CleanupFn = () => void;

const emitEditorCommand = (id: string) => {
  window.dispatchEvent(
    new CustomEvent('writer:editor-command', { detail: { id } }),
  );
};

export function registerParagraphCommands(): CleanupFn {
  const cleanups: CleanupFn[] = [];

  // Headings
  cleanups.push(
    menuCommandBus.register('menu.paragraph.heading_1', () =>
      emitEditorCommand('paragraph.heading_1'),
    ),
  );
  cleanups.push(
    menuCommandBus.register('menu.paragraph.heading_2', () =>
      emitEditorCommand('paragraph.heading_2'),
    ),
  );
  cleanups.push(
    menuCommandBus.register('menu.paragraph.heading_3', () =>
      emitEditorCommand('paragraph.heading_3'),
    ),
  );
  cleanups.push(
    menuCommandBus.register('menu.paragraph.heading_4', () =>
      emitEditorCommand('paragraph.heading_4'),
    ),
  );
  cleanups.push(
    menuCommandBus.register('menu.paragraph.heading_5', () =>
      emitEditorCommand('paragraph.heading_5'),
    ),
  );
  cleanups.push(
    menuCommandBus.register('menu.paragraph.heading_6', () =>
      emitEditorCommand('paragraph.heading_6'),
    ),
  );

  // Block elements
  cleanups.push(
    menuCommandBus.register('menu.paragraph.blockquote', () =>
      emitEditorCommand('paragraph.blockquote'),
    ),
  );
  cleanups.push(
    menuCommandBus.register('menu.paragraph.code_block', () =>
      emitEditorCommand('paragraph.code_block'),
    ),
  );

  // Lists
  cleanups.push(
    menuCommandBus.register('menu.paragraph.unordered_list', () =>
      emitEditorCommand('paragraph.unordered_list'),
    ),
  );
  cleanups.push(
    menuCommandBus.register('menu.paragraph.ordered_list', () =>
      emitEditorCommand('paragraph.ordered_list'),
    ),
  );
  cleanups.push(
    menuCommandBus.register('menu.paragraph.task_list', () =>
      emitEditorCommand('paragraph.task_list'),
    ),
  );

  // Other elements
  cleanups.push(
    menuCommandBus.register('menu.paragraph.table', () =>
      emitEditorCommand('paragraph.table'),
    ),
  );
  cleanups.push(
    menuCommandBus.register('menu.paragraph.horizontal_rule', () =>
      emitEditorCommand('paragraph.horizontal_rule'),
    ),
  );
  cleanups.push(
    menuCommandBus.register('menu.paragraph.math_block', () => {
      useStatusStore.getState().setStatus('idle', t('status.menu.todo'));
    }),
  );

  return () => cleanups.forEach((fn) => fn());
}
