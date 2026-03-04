import { useCallback, useEffect, useRef, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { Editor } from '../ui/editor/Editor';
import { StateDebug } from '../ui/StateDebug';
import { Sidebar } from '../ui/sidebar/Sidebar';
import { useWorkspaceStore } from '../state/slices/workspaceSlice';
import { useEditorStore } from '../state/slices/editorSlice';
import { useStatusStore } from '../state/slices/statusSlice';
import { useSettingsStore } from '../state/slices/settingsSlice';
import { useViewModeStore } from '../state/slices/viewModeSlice';
import { StatusBar } from '../ui/statusbar/StatusBar';
import { AutosaveService } from '../services/autosave/AutosaveService';
import { FsService } from '../services/fs/FsService';
import { scheduleTauriBridgeWarmup } from '../services/runtime/TauriWarmup';
import { ErrorService } from '../services/error/ErrorService';
import { useNativeMenuBridge } from './useNativeMenuBridge';
import {
  t,
  getLocale,
  getLocalePreference,
  setLocalePreference,
  type LocalePreference,
} from '../i18n';
import {
  filterSavableDirtyPaths,
  getCloseAction,
  getForceCloseHint,
} from './closeWorkflow';
import {
  registerFileCommands,
  registerEditCommands,
  registerFormatCommands,
  registerParagraphCommands,
  registerViewCommands,
} from './commands';
import { SettingsPanel } from '../ui/components/Settings';
import { useViewportTier } from '../ui/layout/useViewportTier';
import { useFocusZenWakeup } from '../ui/layout/useFocusZenWakeup';
import './App.css';

function App() {
  const { currentPath } = useWorkspaceStore();
  const { tier } = useViewportTier();
  const isMinTier = tier === 'min';
  const typewriterEnabledByUser = useSettingsStore(
    (state) => state.typewriterEnabledByUser,
  );
  const focusZenEnabledByUser = useSettingsStore(
    (state) => state.focusZenEnabledByUser,
  );
  const setFocusZenEnabledByUser = useSettingsStore(
    (state) => state.setFocusZenEnabledByUser,
  );
  const enterZen = useViewModeStore((state) => state.enterZen);
  const exitZen = useViewModeStore((state) => state.exitZen);
  const isFocusZen = useViewModeStore((state) => state.isFocusZen);
  const setFocusZen = useViewModeStore((state) => state.setFocusZen);
  const isTypewriterActive = useViewModeStore(
    (state) => state.isTypewriterActive,
  );
  const syncTypewriterFromUserPreference = useViewModeStore(
    (state) => state.syncTypewriterFromUserPreference,
  );
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const isOverlaySidebar = isMinTier && isSidebarVisible;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [localePreference, setLocalePreferenceState] = useState<LocalePreference>(
    () => getLocalePreference(),
  );
  const { isHeaderAwake, isFooterAwake } = useFocusZenWakeup({
    enabled: isFocusZen,
  });
  const isClosingRef = useRef(false);
  const isProgrammaticCloseRef = useRef(false);
  const forceCloseRequestedRef = useRef(false);
  const previousIsMinTierRef = useRef<boolean | null>(null);
  const sidebarVisibilityBeforeMinRef = useRef<boolean | null>(null);
  const currentPathRef = useRef(currentPath);
  const showStateDebug =
    import.meta.env.DEV && import.meta.env.VITE_SHOW_STATE_DEBUG === '1';

  useNativeMenuBridge(() => {
    useStatusStore.getState().setStatus('idle', t('status.menu.todo'));
  });

  const toggleSidebar = useCallback(() => {
    setIsSidebarVisible((prev) => {
      const nextVisible = !prev;
      if (nextVisible) {
        exitZen();
      } else {
        enterZen(typewriterEnabledByUser);
      }
      return nextVisible;
    });
  }, [enterZen, exitZen, typewriterEnabledByUser]);
  const toggleFocusZenBySidebarButton = useCallback(() => {
    if (isFocusZen) {
      setFocusZen(false);
      return;
    }
    setIsSidebarVisible(false);
    enterZen(typewriterEnabledByUser);
    setFocusZen(true);
  }, [enterZen, isFocusZen, setFocusZen, typewriterEnabledByUser]);
  const openSettings = useCallback(() => setIsSettingsOpen(true), []);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);
  const handleLocalePreferenceChange = useCallback((preference: LocalePreference) => {
    setLocalePreference(preference);
    setLocalePreferenceState(getLocalePreference());
  }, []);

  useEffect(() => {
    void invoke('set_menu_locale', { locale: getLocale() }).catch(() => {
      // Ignore in web/test runtime where Tauri IPC may be unavailable.
    });
  }, [localePreference]);

  useEffect(() => {
    currentPathRef.current = currentPath;
  }, [currentPath]);

  useEffect(() => {
    syncTypewriterFromUserPreference(typewriterEnabledByUser);
  }, [syncTypewriterFromUserPreference, typewriterEnabledByUser]);

  useEffect(() => {
    if (isFocusZen === focusZenEnabledByUser) {
      return;
    }
    setFocusZen(focusZenEnabledByUser);
  }, [focusZenEnabledByUser, isFocusZen, setFocusZen]);

  useEffect(() => {
    if (focusZenEnabledByUser === isFocusZen) {
      return;
    }
    setFocusZenEnabledByUser(isFocusZen);
  }, [focusZenEnabledByUser, isFocusZen, setFocusZenEnabledByUser]);

  useEffect(() => {
    const previousIsMinTier = previousIsMinTierRef.current;
    const isEnteringMinTier =
      previousIsMinTier === null ? isMinTier : !previousIsMinTier && isMinTier;
    const isLeavingMinTier = previousIsMinTier === true && !isMinTier;
    previousIsMinTierRef.current = isMinTier;

    if (isEnteringMinTier) {
      sidebarVisibilityBeforeMinRef.current = isSidebarVisible;
      setIsSidebarVisible(false);
      enterZen(typewriterEnabledByUser);
      return;
    }

    if (!isLeavingMinTier) {
      return;
    }

    const sidebarVisibilityBeforeMin = sidebarVisibilityBeforeMinRef.current;
    sidebarVisibilityBeforeMinRef.current = null;
    if (sidebarVisibilityBeforeMin === null) {
      return;
    }

    setIsSidebarVisible(sidebarVisibilityBeforeMin);
    if (sidebarVisibilityBeforeMin) {
      exitZen();
      return;
    }
    enterZen(typewriterEnabledByUser);
  }, [enterZen, exitZen, isMinTier, isSidebarVisible, typewriterEnabledByUser]);

  // Warm up Tauri IPC on idle time to reduce first native dialog latency.
  useEffect(() => {
    scheduleTauriBridgeWarmup();
  }, []);

  // Register menu commands
  useEffect(() => {
    const unregister = [
      registerFileCommands(setIsSidebarVisible, isSidebarVisible, openSettings),
      registerEditCommands(),
      registerFormatCommands(),
      registerParagraphCommands(),
      registerViewCommands(toggleSidebar),
    ];

    return () => {
      unregister.forEach((fn) => fn());
    };
  }, [isSidebarVisible, openSettings, toggleSidebar]);

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
    <div
      className="app-container h-screen flex flex-col"
      data-viewport-tier={tier}
      data-overlay-mode={isOverlaySidebar}
    >
      <div className="flex-grow flex overflow-hidden">
        {isOverlaySidebar ? (
          <>
            <div
              className="fixed inset-0 z-30 bg-black/10"
              onClick={() => setIsSidebarVisible(false)}
            />
            <div className="fixed inset-y-0 left-0 z-40">
              <Sidebar
                onToggleVisibility={toggleSidebar}
                onToggleFocusZen={toggleFocusZenBySidebarButton}
              />
            </div>
          </>
        ) : isSidebarVisible ? (
          <Sidebar
            onToggleVisibility={toggleSidebar}
            onToggleFocusZen={toggleFocusZenBySidebarButton}
          />
        ) : null}

        {/* Main Editor Area */}
        <main className="flex-1 flex flex-col relative min-w-0 h-full">
          <Editor
            isSidebarVisible={isSidebarVisible}
            onToggleSidebar={toggleSidebar}
            isTypewriterActive={isTypewriterActive}
            viewportTier={tier}
            isFocusZen={isFocusZen}
            isHeaderAwake={isHeaderAwake}
            onSetFocusZen={setFocusZen}
          />
        </main>

        {/* Debug Sidebar (opt-in): set VITE_SHOW_STATE_DEBUG=1 */}
        {showStateDebug ? (
          <aside className="w-80 flex-shrink-0 overflow-auto bg-gray-100 p-4 h-full border-l">
            <StateDebug />
          </aside>
        ) : null}
      </div>
      <StatusBar isFocusZen={isFocusZen} isVisibleInFocusZen={isFooterAwake} />
      <SettingsPanel
        isOpen={isSettingsOpen}
        viewportTier={tier}
        localePreference={localePreference}
        onLocalePreferenceChange={handleLocalePreferenceChange}
        onClose={closeSettings}
      />
    </div>
  );
}

export default App;
