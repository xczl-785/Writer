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
import {
  filterSavableDirtyPaths,
  getCloseAction,
  getForceCloseHint,
} from './closeWorkflow';
import './App.css';

function App() {
  const { activeFile, currentPath } = useWorkspaceStore();
  const isClosingRef = useRef(false);
  const isProgrammaticCloseRef = useRef(false);
  const forceCloseRequestedRef = useRef(false);
  const currentPathRef = useRef(currentPath);
  const showStateDebug =
    import.meta.env.DEV && import.meta.env.VITE_SHOW_STATE_DEBUG === '1';

  useEffect(() => {
    currentPathRef.current = currentPath;
  }, [currentPath]);

  // Warm up Tauri IPC on idle time to reduce first native dialog latency.
  useEffect(() => {
    scheduleTauriBridgeWarmup();
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
      <header className="p-4 border-b bg-gray-50 flex justify-between items-center">
        <h1 className="text-xl font-bold">Writer</h1>
        <div className="text-sm text-gray-500">
          Active: {activeFile || 'None'}
        </div>
      </header>

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
