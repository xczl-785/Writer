/**
 * View menu commands
 *
 * Handles view operations like outline, sidebar, typewriter mode.
 */
import { menuCommandBus } from '../../ui/commands/menuCommandBus';
import { useStatusStore } from '../../state/slices/statusSlice';
import { useSettingsStore } from '../../state/slices/settingsSlice';
import { t } from '../../i18n';

export type CleanupFn = () => void;

const emitEditorCommand = (id: string) => {
  window.dispatchEvent(
    new CustomEvent('writer:editor-command', { detail: { id } }),
  );
};

export function registerViewCommands(toggleSidebar: () => void): CleanupFn {
  const cleanups: CleanupFn[] = [];

  cleanups.push(
    menuCommandBus.register('menu.view.outline', () =>
      emitEditorCommand('view.outline'),
    ),
  );

  cleanups.push(
    menuCommandBus.register('menu.view.toggle_sidebar', () => {
      toggleSidebar();
    }),
  );

  cleanups.push(
    menuCommandBus.register('menu.view.focus_mode', () => {
      const settingsStore = useSettingsStore.getState();
      const nextEnabled = !settingsStore.typewriterEnabledByUser;
      settingsStore.setTypewriterEnabledByUser(nextEnabled);
      useStatusStore
        .getState()
        .setStatus(
          'idle',
          nextEnabled
            ? t('status.menu.typewriterOn')
            : t('status.menu.typewriterOff'),
        );
    }),
  );

  cleanups.push(
    menuCommandBus.register('menu.view.source_mode', () => {
      useStatusStore.getState().setStatus('idle', t('status.menu.todo'));
    }),
  );

  return () => cleanups.forEach((fn) => fn());
}
