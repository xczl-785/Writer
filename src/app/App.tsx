import { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Editor } from '../ui/editor/Editor';
import { StateDebug } from '../ui/StateDebug';
import { Sidebar } from '../ui/sidebar/Sidebar';
import { useWorkspaceStore } from '../state/slices/workspaceSlice';
import { useEditorStore } from '../state/slices/editorSlice';
import { StatusBar } from '../ui/statusbar/StatusBar';
import { AutosaveService } from '../services/autosave/AutosaveService';
import './App.css';

function App() {
  const { activeFile, openFile } = useWorkspaceStore();
  const { initializeFile } = useEditorStore();

  useEffect(() => {
    const testFile = 'test.md';
    initializeFile(testFile, '# Hello World\n\nStart typing here...');
    openFile(testFile);
  }, [initializeFile, openFile]);

  // Handle window close requests (Tauri)
  useEffect(() => {
    let unlistenFn: (() => void) | undefined;
    let isMounted = true;

    const setupListener = async () => {
      try {
        const appWindow = getCurrentWindow();
        const unlisten = await appWindow.onCloseRequested(async (event) => {
          const state = useEditorStore.getState();
          const isDirty = Object.values(state.fileStates).some(
            (f) => f.isDirty,
          );

          if (isDirty) {
            // Prevent immediate close to allow saving
            event.preventDefault();

            try {
              await AutosaveService.flushAll();
              // Save successful, now we can close
              await appWindow.destroy();
            } catch (error) {
              console.error('Failed to autosave on close:', error);
              // If save fails, we keep the window open (since we prevented default)
            }
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

  // Handle browser beforeunload (for web version or fallback)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const state = useEditorStore.getState();
      const isDirty = Object.values(state.fileStates).some((f) => f.isDirty);

      if (isDirty) {
        // Trigger save immediately
        AutosaveService.flushAll().catch(console.error);

        // Standard browser behavior to show confirmation dialog
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
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

        {/* Debug Sidebar */}
        <aside className="w-80 flex-shrink-0 overflow-auto bg-gray-100 p-4 h-full border-l">
          <StateDebug />
        </aside>
      </div>
      <StatusBar />
    </div>
  );
}

export default App;
