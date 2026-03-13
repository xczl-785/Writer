/**
 * File menu commands
 *
 * Handles file operations like open, close, save, new, export.
 */
import { menuCommandBus } from '../../ui/commands/menuCommandBus';
import { workspaceActions } from '../../state/actions/workspaceActions';
import { useWorkspaceStore } from '../../state/slices/workspaceSlice';
import { useEditorStore } from '../../state/slices/editorSlice';
import { useStatusStore } from '../../state/slices/statusSlice';
import { AutosaveService } from '../../services/autosave/AutosaveService';
import { FsService } from '../../services/fs/FsService';
import { RecentItemsService } from '../../services/recent/RecentItemsService';
import { t } from '../../i18n';
import { openWorkspace } from '../../workspace/WorkspaceManager';

export type CleanupFn = () => void;
export type OpenRecentCallback = () => void;

const emitSidebarCommand = (id: string) => {
  window.dispatchEvent(
    new CustomEvent('writer:sidebar-command', { detail: { id } }),
  );
};

export function registerFileCommands(
  setIsSidebarVisible: (value: boolean | ((prev: boolean) => boolean)) => void,
  isSidebarVisible: boolean,
  onOpenSettings: () => void,
  onOpenRecent?: OpenRecentCallback,
): CleanupFn {
  const cleanups: CleanupFn[] = [];

  cleanups.push(
    menuCommandBus.register('menu.file.open_folder', async () => {
      await openWorkspace();
    }),
  );

  cleanups.push(
    menuCommandBus.register('menu.file.close_folder', () => {
      workspaceActions.closeWorkspace();
      useStatusStore.getState().setStatus('idle', t('menu.file.closeFolder'));
    }),
  );

  cleanups.push(
    menuCommandBus.register('menu.file.save', async () => {
      const workspace = useWorkspaceStore.getState();
      const status = useStatusStore.getState();

      if (!workspace.activeFile) {
        status.setStatus('error', t('status.menu.noWorkspace'));
        return;
      }

      const path = workspace.activeFile;
      const fileState = useEditorStore.getState().fileStates[path];

      if (!fileState) {
        status.setStatus('error', t('status.menu.unavailable'));
        return;
      }

      try {
        status.markSaving(path);

        if (AutosaveService.isPending(path)) {
          await AutosaveService.flush(path);
        } else {
          await FsService.writeFileAtomic(path, fileState.content);
          useEditorStore.getState().setDirty(path, false);
          status.markSaved(t('status.menu.saved'));
        }
      } catch {
        status.setStatus('error', t('status.menu.saveFailed'));
      }
    }),
  );

  cleanups.push(
    menuCommandBus.register('menu.file.new', () => {
      if (!isSidebarVisible) {
        setIsSidebarVisible(true);
      }
      emitSidebarCommand('new-file');
    }),
  );

  cleanups.push(
    menuCommandBus.register('menu.file.save_as', () => {
      useStatusStore.getState().setStatus('idle', t('status.menu.todo'));
    }),
  );

  cleanups.push(
    menuCommandBus.register('menu.file.export_pdf', () => {
      useStatusStore.getState().setStatus('idle', t('status.menu.todo'));
    }),
  );

  cleanups.push(
    menuCommandBus.register('menu.file.export_html', () => {
      useStatusStore.getState().setStatus('idle', t('status.menu.todo'));
    }),
  );

  cleanups.push(
    menuCommandBus.register('menu.file.export_image', () => {
      useStatusStore.getState().setStatus('idle', t('status.menu.todo'));
    }),
  );

  cleanups.push(
    menuCommandBus.register('menu.file.settings', () => {
      onOpenSettings();
    }),
  );

  // Recent items commands
  cleanups.push(
    menuCommandBus.register('menu.file.open_recent', () => {
      if (onOpenRecent) {
        onOpenRecent();
      }
    }),
  );

  cleanups.push(
    menuCommandBus.register('menu.file.clear_recent', () => {
      RecentItemsService.clearAll();
      useStatusStore.getState().setStatus('idle', t('recent.clearHistory'));
    }),
  );

  return () => {
    for (const fn of cleanups) {
      fn();
    }
  };
}
