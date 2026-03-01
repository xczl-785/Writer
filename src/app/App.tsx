import { useEffect, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Editor } from '../ui/editor/Editor';
import { StateDebug } from '../ui/StateDebug';
import { Sidebar } from '../ui/sidebar/Sidebar';
import { useWorkspaceStore } from '../state/slices/workspaceSlice';
import { useEditorStore } from '../state/slices/editorSlice';
import { useStatusStore } from '../state/slices/statusSlice';
import { StatusBar } from '../ui/statusbar/StatusBar';
import { AutosaveService } from '../services/autosave/AutosaveService';
import { FsService } from '../services/fs/FsService';
import { scheduleTauriBridgeWarmup } from '../services/runtime/TauriWarmup';
import { ErrorService } from '../services/error/ErrorService';
import { workspaceActions } from '../state/actions/workspaceActions';
import { openWorkspace } from '../workspace/WorkspaceManager';
import { menuCommandBus } from '../ui/commands/menuCommandBus';
import { useNativeMenuBridge } from './useNativeMenuBridge';
import { t } from '../i18n';
import {
  filterSavableDirtyPaths,
  getCloseAction,
  getForceCloseHint,
} from './closeWorkflow';
import './App.css';

function App() {
  const { currentPath } = useWorkspaceStore();
  const isClosingRef = useRef(false);
  const isProgrammaticCloseRef = useRef(false);
  const forceCloseRequestedRef = useRef(false);
  const currentPathRef = useRef(currentPath);
  const showStateDebug =
    import.meta.env.DEV && import.meta.env.VITE_SHOW_STATE_DEBUG === '1';

  useNativeMenuBridge(() => {
    useStatusStore.getState().setStatus('idle', t('status.menu.todo'));
  });

  useEffect(() => {
    currentPathRef.current = currentPath;
  }, [currentPath]);

  // Warm up Tauri IPC on idle time to reduce first native dialog latency.
  useEffect(() => {
    scheduleTauriBridgeWarmup();
  }, []);

  useEffect(() => {
    const emitEditorCommand = (id: string) => {
      window.dispatchEvent(new CustomEvent('writer:editor-command', { detail: { id } }));
    };

    const unregister = [
      menuCommandBus.register('menu.file.open_folder', async () => {
        await openWorkspace();
      }),
      menuCommandBus.register('menu.file.close_folder', () => {
        workspaceActions.closeWorkspace();
        useStatusStore.getState().setStatus('idle', t('menu.file.closeFolder'));
      }),
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
      menuCommandBus.register('menu.file.new', () => {
        window.dispatchEvent(new CustomEvent('writer:sidebar-command', { detail: { id: 'new-file' } }));
      }),
      menuCommandBus.register('menu.edit.undo', () => emitEditorCommand('edit.undo')),
      menuCommandBus.register('menu.edit.redo', () => emitEditorCommand('edit.redo')),
      menuCommandBus.register('menu.edit.select_all', () => emitEditorCommand('edit.select_all')),
      menuCommandBus.register('menu.edit.find', () => emitEditorCommand('edit.find')),
      menuCommandBus.register('menu.edit.replace', () => emitEditorCommand('edit.replace')),
      menuCommandBus.register('menu.format.bold', () => emitEditorCommand('format.bold')),
      menuCommandBus.register('menu.format.italic', () => emitEditorCommand('format.italic')),
      menuCommandBus.register('menu.format.inline_code', () => emitEditorCommand('format.inline_code')),
      menuCommandBus.register('menu.paragraph.heading_1', () => emitEditorCommand('paragraph.heading_1')),
      menuCommandBus.register('menu.paragraph.heading_2', () => emitEditorCommand('paragraph.heading_2')),
      menuCommandBus.register('menu.paragraph.heading_3', () => emitEditorCommand('paragraph.heading_3')),
      menuCommandBus.register('menu.paragraph.blockquote', () => emitEditorCommand('paragraph.blockquote')),
      menuCommandBus.register('menu.paragraph.code_block', () => emitEditorCommand('paragraph.code_block')),
      menuCommandBus.register('menu.paragraph.unordered_list', () => emitEditorCommand('paragraph.unordered_list')),
      menuCommandBus.register('menu.paragraph.ordered_list', () => emitEditorCommand('paragraph.ordered_list')),
      menuCommandBus.register('menu.paragraph.table', () => emitEditorCommand('paragraph.table')),
      menuCommandBus.register('menu.view.outline', () => emitEditorCommand('view.outline')),
      menuCommandBus.register('menu.view.toggle_sidebar', () => {
        useStatusStore.getState().setStatus('idle', t('status.menu.todo'));
      }),
    ];

    return () => {
      unregister.forEach((fn) => fn());
    };
  }, []);

  // Handle window close requests (Tauri)
  useEffect(() => {
    let unlistenFn: (() => void) | undefined;
    let isMounted = true;

    const setupListener = async () => {
      try {
        const appWindow = getCurrentWindow();
        const unlisten = await appWindow.onCloseRequested(async (event) => {
          if (isProgrammaticCloseRef.current) {
            return;
          }

          if (isClosingRef.current) {
            event.preventDefault();
            return;
          }

          const state = useEditorStore.getState();
          const dirtyPaths = Object.entries(state.fileStates)
            .filter(([, fileState]) => fileState.isDirty)
            .map(([path]) => path);
          const savableDirtyPaths = filterSavableDirtyPaths(
            dirtyPaths,
            currentPathRef.current,
          );
          const action = getCloseAction({
            hasDirty: savableDirtyPaths.length > 0,
            forceCloseRequested: forceCloseRequestedRef.current,
          });

          if (action === 'close_now') {
            forceCloseRequestedRef.current = false;
            return;
          }

          event.preventDefault();
          isClosingRef.current = true;

          try {
            // Flush only files in current workspace; avoid invalid/stale paths.
            for (const path of savableDirtyPaths) {
              if (AutosaveService.isPending(path)) {
                await AutosaveService.flush(path);
              }
            }

            // Persist any remaining dirty in-memory states (no pending timer).
            const latestFileStates = useEditorStore.getState().fileStates;
            const remainingDirtyPaths = filterSavableDirtyPaths(
              Object.entries(latestFileStates)
                .filter(([, fileState]) => fileState.isDirty)
                .map(([path]) => path),
              currentPathRef.current,
            );
            for (const path of remainingDirtyPaths) {
              const fileState = latestFileStates[path];
              if (!fileState) continue;
              await FsService.writeFileAtomic(path, fileState.content);
              useEditorStore.getState().setDirty(path, false);
            }

            isProgrammaticCloseRef.current = true;
            forceCloseRequestedRef.current = false;
            await appWindow.close();
          } catch (error) {
            ErrorService.log(error, 'Failed to autosave on close');
            useStatusStore.getState().setStatus('error', getForceCloseHint());
            forceCloseRequestedRef.current = true;
            isProgrammaticCloseRef.current = false;
          } finally {
            isClosingRef.current = false;
          }
        });

        if (isMounted) {
          unlistenFn = unlisten;
        } else {
          unlisten();
        }
      } catch (error) {
        console.warn(
          'Failed to setup Tauri window listener (ignore if in browser):',
          error,
        );
      }
    };

    setupListener();

    return () => {
      isMounted = false;
      if (unlistenFn) {
        unlistenFn();
      }
    };
  }, []);

  return (
    <div className="app-container h-screen flex flex-col">
      <div className="flex-grow flex overflow-hidden">
        <Sidebar />

        {/* Main Editor Area */}
        <main className="flex-1 flex flex-col relative min-w-0 h-full">
          <Editor />
        </main>

        {/* Debug Sidebar (opt-in): set VITE_SHOW_STATE_DEBUG=1 */}
        {showStateDebug ? (
          <aside className="w-80 flex-shrink-0 overflow-auto bg-gray-100 p-4 h-full border-l">
            <StateDebug />
          </aside>
        ) : null}
      </div>
      <StatusBar />
    </div>
  );
}

export default App;
