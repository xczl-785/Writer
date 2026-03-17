/**
 * File menu commands
 *
 * Handles file operations like open, close, save, new, export.
 */
import { getCurrentWindow } from '@tauri-apps/api/window';
import { menuCommandBus } from '../../ui/commands/menuCommandBus';
import { useFileTreeStore } from '../../domains/file/state/fileStore';
import { AutosaveService } from '../../domains/file/services/AutosaveService';
import { FsService } from '../../domains/file/services/FsService';
import { useEditorStore } from '../../domains/editor/state/editorStore';
import { workspaceActions } from '../../domains/workspace/services/workspaceActions';
import {
  addFolderToWorkspaceByDialog,
  openFileWithDialog,
  openWorkspace,
  openWorkspaceFile,
  saveCurrentWorkspace,
  saveWorkspaceFileByDialog,
} from '../../domains/workspace/services/WorkspaceManager';
import {
  dispatchCreateEntry,
  resolveCreateEntryMenuTarget,
} from '../../domains/workspace/services/createEntryCommands';
import {
  getWorkspaceContext,
  useWorkspaceStore,
} from '../../domains/workspace/state/workspaceStore';
import { useStatusStore } from '../../state/slices/statusSlice';
import { t } from '../../shared/i18n';

export type CleanupFn = () => void;
export type OpenRecentCallback = () => void;

function emitSidebarCommand(id: string): void {
  window.dispatchEvent(
    new CustomEvent('writer:sidebar-command', { detail: { id } }),
  );
}

function getSelectedRootFolderPath(): string | null {
  const selectedPath = useFileTreeStore.getState().selectedPath;
  if (!selectedPath) {
    return null;
  }

  const selectedRoot = useFileTreeStore
    .getState()
    .rootFolders.find((folder) => folder.workspacePath === selectedPath);

  return selectedRoot?.workspacePath ?? null;
}

function hasWorkspaceContext(): boolean {
  return getWorkspaceContext(useWorkspaceStore.getState()) !== 'none';
}

function canSaveWorkspace(): boolean {
  const workspaceContext = getWorkspaceContext(useWorkspaceStore.getState());
  return workspaceContext !== 'none';
}

export function registerFileCommands(
  setIsSidebarVisible: (value: boolean | ((prev: boolean) => boolean)) => void,
  isSidebarVisible: boolean,
  onOpenSettings: () => void,
  onOpenRecent?: OpenRecentCallback,
): CleanupFn {
  const cleanups: CleanupFn[] = [];

  cleanups.push(
    menuCommandBus.register('menu.file.open_file', async () => {
      await openFileWithDialog();
    }),
  );

  cleanups.push(
    menuCommandBus.register('menu.file.open_folder', async () => {
      await openWorkspace();
    }),
  );

  cleanups.push(
    menuCommandBus.register('menu.file.open_workspace', async () => {
      await openWorkspaceFile();
    }),
  );

  cleanups.push(
    menuCommandBus.register('menu.file.close_file', () => {
      const activeFile = useWorkspaceStore.getState().activeFile;
      if (!activeFile) {
        useStatusStore.getState().setStatus('error', t('status.menu.unavailable'));
        return;
      }

      useWorkspaceStore.getState().closeFile(activeFile);
      useStatusStore.getState().setStatus('idle', t('menu.file.closeFile'));
    }),
  );

  cleanups.push(
    menuCommandBus.register('menu.file.close_folder', async () => {
      const selectedRootFolderPath = getSelectedRootFolderPath();
      if (!selectedRootFolderPath) {
        useStatusStore.getState().setStatus('error', t('status.menu.unavailable'));
        return;
      }

      const result = await workspaceActions.removeFolderFromWorkspace(
        selectedRootFolderPath,
      );
      if (!result.ok) {
        useStatusStore.getState().setStatus('error', result.error);
        return;
      }

      if (!hasWorkspaceContext()) {
        useStatusStore.getState().setStatus('idle', null);
        return;
      }

      useStatusStore.getState().setStatus('idle', t('menu.file.closeFolder'));
    }),
  );

  cleanups.push(
    menuCommandBus.register('menu.file.close_workspace', async () => {
      await workspaceActions.closeWorkspace();
      useStatusStore.getState().setStatus('idle', t('menu.file.closeWorkspace'));
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
      const createTarget = resolveCreateEntryMenuTarget('menu.file.new');
      if (!createTarget) {
        return;
      }

      dispatchCreateEntry({
        createTarget,
        isSidebarVisible,
        setIsSidebarVisible,
        emit: emitSidebarCommand,
      });
    }),
  );

  cleanups.push(
    menuCommandBus.register('menu.file.new_folder', () => {
      const createTarget = resolveCreateEntryMenuTarget('menu.file.new_folder');
      if (!createTarget) {
        return;
      }

      dispatchCreateEntry({
        createTarget,
        isSidebarVisible,
        setIsSidebarVisible,
        emit: emitSidebarCommand,
      });
    }),
  );

  cleanups.push(
    menuCommandBus.register('menu.file.add_folder_to_workspace', async () => {
      if (!hasWorkspaceContext()) {
        useStatusStore.getState().setStatus('error', t('status.menu.noWorkspace'));
        return;
      }

      await addFolderToWorkspaceByDialog();
    }),
  );

  cleanups.push(
    menuCommandBus.register('menu.file.save_workspace', async () => {
      if (!canSaveWorkspace()) {
        useStatusStore.getState().setStatus('error', t('status.menu.noWorkspace'));
        return;
      }

      await saveCurrentWorkspace();
    }),
  );

  cleanups.push(
    menuCommandBus.register('menu.file.save_workspace_as', async () => {
      if (!canSaveWorkspace()) {
        useStatusStore.getState().setStatus('error', t('status.menu.noWorkspace'));
        return;
      }

      await saveWorkspaceFileByDialog();
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

  cleanups.push(
    menuCommandBus.register('menu.file.exit', () => {
      void getCurrentWindow()
        .close()
        .catch(() => {
          // Ignore outside Tauri runtime.
        });
    }),
  );

  cleanups.push(
    menuCommandBus.register('menu.file.open_recent', () => {
      if (onOpenRecent) {
        onOpenRecent();
      }
    }),
  );

  return () => {
    for (const fn of cleanups) {
      fn();
    }
  };
}
