import { useCallback, useEffect, useRef, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { Editor } from '../domains/editor/core/Editor';
import { StateDebug } from '../ui/StateDebug';
import { Sidebar } from '../ui/sidebar/Sidebar';
import { useWorkspaceStore } from '../domains/workspace/state/workspaceStore';
import { useEditorStore } from '../domains/editor/state/editorStore';
import { useStatusStore } from '../state/slices/statusSlice';
import { useSettingsStore } from '../domains/settings/state/settingsStore';
import { useViewModeStore } from '../state/slices/viewModeSlice';
import { StatusBar } from '../ui/statusbar/StatusBar';
import { AutosaveService } from '../domains/file/services/AutosaveService';
import { FsService } from '../domains/file/services/FsService';
import { scheduleTauriBridgeWarmup } from '../services/runtime/TauriWarmup';
import { ErrorService } from '../services/error/ErrorService';
import { useNativeMenuBridge } from './useNativeMenuBridge';
import { RecentWorkspacesMenu } from '../ui/components/RecentWorkspaces/RecentWorkspacesMenu';
import {
  DragDropHint,
  EditorDropBlockedOverlay,
} from '../ui/components/ErrorStates';
import { EmptyStateWorkspace } from '../ui/workspace/EmptyStateWorkspace';
import {
  RecentItemsService,
  type RecentItem,
} from '../domains/workspace/services/RecentItemsService';
import { workspaceActions } from '../domains/workspace/services/workspaceActions';
import {
  t,
  getLocale,
  getLocalePreference,
  setLocalePreference,
  type LocalePreference,
} from '../shared/i18n';
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
import { AppChrome } from './AppChrome';
import { createAppChromeModel } from '../ui/chrome/chromeState';
import {
  handleDroppedFolderPaths,
  openWorkspace,
  openWorkspaceFile,
} from '../domains/workspace/services/WorkspaceManager';
import {
  classifyDroppedPaths,
  extractDroppedPaths,
} from '../domains/workspace/services/droppedPaths';
import {
  handleDropToEditor,
  handleDropToSidebar,
} from '../domains/file/services/SingleFileDropHandler';
import type { DropHandlerDeps } from '../domains/file/services/types';
import { showFileConflictDialog } from '../ui/components/Dialog/FileConflictDialog.tsx';
import { useFileTreeStore } from '../domains/file/state/fileStore';
import './App.css';

type DropZone = { sidebar: boolean; main: boolean };

function getDropZone(
  sidebarRef: HTMLElement | null,
  mainRef: HTMLElement | null,
  x: number,
  y: number,
): DropZone {
  return {
    sidebar: isPointInsideElement(sidebarRef, x, y),
    main: isPointInsideElement(mainRef, x, y),
  };
}

function buildDropHandlerDeps(
  hasWorkspace: boolean,
  setEditorDragOver: (v: boolean) => void,
  setEditorDropBlocked: (v: boolean, reason?: string) => void,
): DropHandlerDeps {
  return {
    selectedPath: useFileTreeStore.getState().selectedPath,
    rootFolders: useFileTreeStore.getState().rootFolders,
    hasWorkspace,
    onOpenFile: workspaceActions.openFile,
    onRefreshFileTree: async (rootPath: string) => {
      const nodes = await FsService.listTree(rootPath);
      useFileTreeStore.getState().setNodes(rootPath, nodes);
    },
    onShowStatus: (type: 'success' | 'error' | 'info', message: string) => {
      const statusMap: Record<
        'success' | 'error' | 'info',
        'idle' | 'loading' | 'error'
      > = {
        success: 'idle',
        error: 'error',
        info: 'loading',
      };
      useStatusStore.getState().setStatus(statusMap[type], message);
    },
    showConflictDialog: async (fileName: string) =>
      showFileConflictDialog(fileName),
    onSetDragOver: setEditorDragOver,
    onSetDropBlocked: setEditorDropBlocked,
    isSaving: () => false,
  };
}

function flattenRecentItems(
  data: Awaited<ReturnType<typeof RecentItemsService.getAll>>,
): RecentItem[] {
  return [...data.workspaces, ...data.folders, ...data.files];
}

function isPointInsideElement(
  element: HTMLElement | null,
  x: number,
  y: number,
): boolean {
  if (!element) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function App() {
  const { folders, activeFile } = useWorkspaceStore();
  const hasWorkspace = folders.length > 0;
  const hasOpenFile = activeFile !== null;
  const currentPath = folders[0]?.path;
  const { tier } = useViewportTier();
  const isMinTier = tier === 'min';
  const typewriterEnabledByUser = useSettingsStore(
    (state) => state.typewriterEnabledByUser,
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
  const focusZenEnabledByUser = useSettingsStore(
    (state) => state.focusZenEnabledByUser,
  );
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const isOverlaySidebar = isMinTier && isSidebarVisible;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRecentMenuOpen, setIsRecentMenuOpen] = useState(false);
  const [isEditorDragOver, setIsEditorDragOver] = useState(false);
  const [isEditorDropBlocked, setIsEditorDropBlocked] = useState(false);
  const [isSidebarDragOver, setIsSidebarDragOver] = useState(false);
  const [dragClassificationType, setDragClassificationType] = useState<
    'files' | 'folders' | null
  >(null);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [localePreference, setLocalePreferenceState] =
    useState<LocalePreference>(() => getLocalePreference());
  const { isHeaderAwake, isFooterAwake } = useFocusZenWakeup({
    enabled: isFocusZen,
  });
  const isClosingRef = useRef(false);
  const isProgrammaticCloseRef = useRef(false);
  const forceCloseRequestedRef = useRef(false);
  const previousIsMinTierRef = useRef<boolean | null>(null);
  const sidebarVisibilityRef = useRef<boolean>(isSidebarVisible);
  const sidebarVisibilityBeforeMinRef = useRef<boolean | null>(null);
  const currentPathRef = useRef(currentPath);
  const mainDropZoneRef = useRef<HTMLElement | null>(null);
  const sidebarDropZoneRef = useRef<HTMLDivElement | null>(null);
  const dragClassificationTypeRef = useRef<'files' | 'folders' | null>(null);
  const showStateDebug =
    import.meta.env.DEV && import.meta.env.VITE_SHOW_STATE_DEBUG === '1';

  useNativeMenuBridge(() => {
    useStatusStore.getState().setStatus('idle', t('status.menu.todo'));
  });

  const toggleSidebar = useCallback(() => {
    const nextVisible = !sidebarVisibilityRef.current;
    setIsSidebarVisible(nextVisible);
    if (nextVisible) {
      exitZen();
      return;
    }
    enterZen(typewriterEnabledByUser);
  }, [enterZen, exitZen, typewriterEnabledByUser]);
  const applyFocusZen = useCallback(
    (enabled: boolean) => {
      if (enabled) {
        setIsSidebarVisible(false);
        enterZen(typewriterEnabledByUser);
      }
      setFocusZen(enabled);
      setFocusZenEnabledByUser(enabled);
    },
    [enterZen, setFocusZen, setFocusZenEnabledByUser, typewriterEnabledByUser],
  );
  const chrome = createAppChromeModel({
    hasRecentItems: recentItems.length > 0,
    isSidebarVisible,
    isFocusZen,
    isHeaderAwake,
    onToggleSidebar: toggleSidebar,
    onSetSidebarVisible: setIsSidebarVisible,
    onSetFocusZen: applyFocusZen,
  });
  const openSettings = useCallback(() => setIsSettingsOpen(true), []);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);
  const openRecentMenu = useCallback(() => setIsRecentMenuOpen(true), []);
  const closeRecentMenu = useCallback(() => setIsRecentMenuOpen(false), []);
  const refreshRecentItems = useCallback(async () => {
    const data = await RecentItemsService.getAll();
    setRecentItems(flattenRecentItems(data));
  }, []);
  const handleOpenFolder = useCallback(async () => {
    await openWorkspace();
    await refreshRecentItems();
  }, [refreshRecentItems]);
  const handleOpenWorkspaceFile = useCallback(async () => {
    await openWorkspaceFile();
    await refreshRecentItems();
  }, [refreshRecentItems]);
  const handleDroppedFolders = useCallback(
    async (paths: string[], openInNewWorkspace: boolean) => {
      const droppedPaths = extractDroppedPaths(paths.map((path) => ({ path })));
      const classification = await classifyDroppedPaths(
        droppedPaths,
        FsService.getPathKind,
      );

      if (classification.directories.length === 0) {
        useStatusStore
          .getState()
          .setStatus('error', t('workspace.dragFoldersOnly'));
        return;
      }

      await handleDroppedFolderPaths(classification.directories, {
        openInNewWorkspace,
      });
      await refreshRecentItems();
    },
    [refreshRecentItems],
  );

  // Handle selection from recent menu
  const handleSelectWorkspace = useCallback(async (path: string) => {
    try {
      useStatusStore.getState().setStatus('loading', 'Loading workspace...');
      const result = await workspaceActions.loadWorkspaceFile(path);
      if (result.ok) {
        useStatusStore.getState().setStatus('idle');
      } else {
        useStatusStore.getState().setStatus('error', result.errorMessage);
      }
    } catch (error) {
      ErrorService.handle(
        error,
        'Failed to load workspace',
        'Failed to load workspace',
      );
    }
  }, []);

  const handleSelectFolder = useCallback(async (path: string) => {
    try {
      useStatusStore.getState().setStatus('loading', 'Loading folder...');
      await workspaceActions.loadWorkspace(path);
      useStatusStore.getState().setStatus('idle');
    } catch (error) {
      ErrorService.handle(
        error,
        'Failed to load folder',
        'Failed to load folder',
      );
    }
  }, []);

  const handleSelectFile = useCallback(async (path: string) => {
    try {
      useStatusStore.getState().setStatus('loading', 'Opening file...');
      const result = await workspaceActions.openFile(path);
      if (result.ok) {
        useStatusStore.getState().setStatus('idle');
      } else {
        useStatusStore.getState().setStatus('error', result.reason);
      }
    } catch (error) {
      ErrorService.handle(error, 'Failed to open file', 'Failed to open file');
    }
  }, []);
  const handleSelectRecentItem = useCallback(
    async (item: RecentItem) => {
      if (item.type === 'workspace') {
        await handleSelectWorkspace(item.path);
      } else if (item.type === 'folder') {
        await handleSelectFolder(item.path);
      } else {
        await handleSelectFile(item.path);
      }
      await refreshRecentItems();
    },
    [
      handleSelectFile,
      handleSelectFolder,
      handleSelectWorkspace,
      refreshRecentItems,
    ],
  );

  const handleLocalePreferenceChange = useCallback(
    (preference: LocalePreference) => {
      setLocalePreference(preference);
      setLocalePreferenceState(getLocalePreference());
    },
    [],
  );

  useEffect(() => {
    void invoke('set_menu_locale', { locale: getLocale() }).catch(() => {
      // Ignore in web/test runtime where Tauri IPC may be unavailable.
    });
  }, [localePreference]);

  useEffect(() => {
    currentPathRef.current = currentPath;
  }, [currentPath]);

  useEffect(() => {
    sidebarVisibilityRef.current = isSidebarVisible;
  }, [isSidebarVisible]);

  useEffect(() => {
    syncTypewriterFromUserPreference(typewriterEnabledByUser);
  }, [syncTypewriterFromUserPreference, typewriterEnabledByUser]);

  useEffect(() => {
    setFocusZen(focusZenEnabledByUser);
  }, [focusZenEnabledByUser, setFocusZen]);

  useEffect(() => {
    void refreshRecentItems();
  }, [refreshRecentItems]);

  useEffect(() => {
    const previousIsMinTier = previousIsMinTierRef.current;
    if (previousIsMinTier === null) {
      previousIsMinTierRef.current = isMinTier;
      if (!isMinTier) {
        return;
      }
      sidebarVisibilityBeforeMinRef.current = sidebarVisibilityRef.current;
      setIsSidebarVisible(false);
      enterZen(typewriterEnabledByUser);
      return;
    }

    if (previousIsMinTier === isMinTier) {
      return;
    }
    previousIsMinTierRef.current = isMinTier;

    if (isMinTier) {
      sidebarVisibilityBeforeMinRef.current = sidebarVisibilityRef.current;
      setIsSidebarVisible(false);
      enterZen(typewriterEnabledByUser);
      return;
    }

    const sidebarVisibilityBeforeMin = sidebarVisibilityBeforeMinRef.current;
    sidebarVisibilityBeforeMinRef.current = null;
    if (sidebarVisibilityBeforeMin === null) return;

    setIsSidebarVisible(sidebarVisibilityBeforeMin);
    if (sidebarVisibilityBeforeMin) {
      exitZen();
      return;
    }
    enterZen(typewriterEnabledByUser);
  }, [enterZen, exitZen, isMinTier, typewriterEnabledByUser]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let mounted = true;

    const clearDragState = () => {
      if (!mounted) return;
      dragClassificationTypeRef.current = null;
      setIsSidebarDragOver(false);
      setIsEditorDragOver(false);
      setIsEditorDropBlocked(false);
      setDragClassificationType(null);
    };

    const updateDragTargetForFiles = (zone: DropZone) => {
      dragClassificationTypeRef.current = 'files';
      setDragClassificationType('files');
      if (zone.sidebar) {
        setIsSidebarDragOver(true);
        setIsEditorDragOver(false);
        setIsEditorDropBlocked(false);
      } else if (zone.main) {
        setIsEditorDragOver(true);
        setIsEditorDropBlocked(false);
      } else {
        clearDragState();
      }
    };

    const updateDragTargetForFolders = (zone: DropZone) => {
      dragClassificationTypeRef.current = 'folders';
      setDragClassificationType('folders');
      setIsSidebarDragOver(zone.sidebar);
      setIsEditorDragOver(!hasWorkspace && !zone.sidebar && zone.main);
      setIsEditorDropBlocked(hasWorkspace && !zone.sidebar && zone.main);
    };

    const updateDragTarget = async (paths: string[], x: number, y: number) => {
      const classification = await classifyDroppedPaths(
        paths,
        FsService.getPathKind,
      );
      if (!mounted) {
        clearDragState();
        return;
      }

      const zone = getDropZone(
        sidebarDropZoneRef.current,
        mainDropZoneRef.current,
        x,
        y,
      );

      // TODO: 混合拖入（文件+文件夹）当前优先处理文件，后续需确认期望行为
      // TODO: 多文件拖入当前只处理第一个文件，后续需确认是否支持批量打开
      if (classification.files.length > 0) {
        updateDragTargetForFiles(zone);
        return;
      }

      if (classification.directories.length > 0) {
        updateDragTargetForFolders(zone);
        return;
      }

      clearDragState();
    };

    const handleDragOver = (x: number, y: number) => {
      if (!mounted) return;
      const zone = getDropZone(
        sidebarDropZoneRef.current,
        mainDropZoneRef.current,
        x,
        y,
      );

      // 使用缓存的分类结果，避免 over 事件覆盖 enter 设置的正确状态
      const classification = dragClassificationTypeRef.current;
      if (classification === 'files') {
        updateDragTargetForFiles(zone);
      } else if (classification === 'folders') {
        updateDragTargetForFolders(zone);
      }
    };

    const handleFileDrop = async (filePath: string, zone: DropZone) => {
      const deps = buildDropHandlerDeps(
        hasWorkspace,
        setIsEditorDragOver,
        setIsEditorDropBlocked,
      );

      if (zone.sidebar && hasWorkspace) {
        await handleDropToSidebar(filePath, deps);
      } else {
        await handleDropToEditor(filePath, deps);
      }
      await refreshRecentItems();
    };

    const handleFolderDrop = async (directories: string[], zone: DropZone) => {
      if (!zone.sidebar && !zone.main) return;

      if (hasWorkspace && zone.main) {
        useStatusStore
          .getState()
          .setStatus('error', t('workspace.dropInEditorDisabled'));
        return;
      }

      // 有工作区且拖到侧边栏时，添加到现有工作区；否则打开新工作区
      await handleDroppedFolderPaths(directories, {
        openInNewWorkspace: !(hasWorkspace && zone.sidebar),
      });
      await refreshRecentItems();
    };

    const registerDragDrop = async () => {
      try {
        unlisten = await getCurrentWindow().onDragDropEvent(async (event) => {
          if (event.payload.type === 'leave') {
            clearDragState();
            return;
          }

          const scale = window.devicePixelRatio || 1;
          const x = event.payload.position.x / scale;
          const y = event.payload.position.y / scale;

          if (event.payload.type === 'enter') {
            await updateDragTarget(event.payload.paths, x, y);
            return;
          }

          if (event.payload.type === 'over') {
            handleDragOver(x, y);
            return;
          }

          const classification = await classifyDroppedPaths(
            event.payload.paths,
            FsService.getPathKind,
          );
          clearDragState();

          if (!mounted) return;

          const zone = getDropZone(
            sidebarDropZoneRef.current,
            mainDropZoneRef.current,
            x,
            y,
          );

          // TODO: 混合拖入（文件+文件夹）当前优先处理文件，后续需确认期望行为
          // TODO: 多文件拖入当前只处理第一个文件，后续需确认是否支持批量打开
          if (classification.files.length > 0) {
            await handleFileDrop(classification.files[0], zone);
            return;
          }

          if (classification.directories.length > 0) {
            await handleFolderDrop(classification.directories, zone);
            return;
          }

          useStatusStore
            .getState()
            .setStatus('error', t('workspace.dragFoldersOnly'));
        });
      } catch {
        // Ignore in non-Tauri runtimes.
      }
    };

    void registerDragDrop();

    return () => {
      mounted = false;
      unlisten?.();
    };
  }, [hasWorkspace, refreshRecentItems]);

  // Warm up Tauri IPC on idle time to reduce first native dialog latency.
  useEffect(() => {
    scheduleTauriBridgeWarmup();
  }, []);

  // Register menu commands
  useEffect(() => {
    const unregister = [
      registerFileCommands(
        setIsSidebarVisible,
        isSidebarVisible,
        openSettings,
        openRecentMenu,
      ),
      registerEditCommands(),
      registerFormatCommands(),
      registerParagraphCommands(),
      registerViewCommands(toggleSidebar),
    ];

    return () => {
      unregister.forEach((fn) => fn());
    };
  }, [isSidebarVisible, openSettings, toggleSidebar, openRecentMenu]);

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
      <AppChrome chrome={chrome} />
      <div className="flex-grow flex overflow-hidden">
        {isOverlaySidebar ? (
          <>
            <div
              className="fixed inset-0 z-30 bg-black/10"
              onClick={() => chrome.actions.setSidebarVisible(false)}
            />
            <div
              ref={sidebarDropZoneRef}
              className="fixed inset-y-0 left-0 z-40"
            >
              <Sidebar
                isExternalDragOver={isSidebarDragOver}
                dragClassificationType={dragClassificationType}
              />
            </div>
          </>
        ) : isSidebarVisible ? (
          <div ref={sidebarDropZoneRef}>
            <Sidebar
              isExternalDragOver={isSidebarDragOver}
              dragClassificationType={dragClassificationType}
            />
          </div>
        ) : null}

        {/* Main Editor Area */}
        <main
          ref={mainDropZoneRef}
          className="flex-1 flex flex-col relative min-w-0 h-full"
        >
          {!hasWorkspace && !hasOpenFile ? (
            <EmptyStateWorkspace
              onOpenFolder={handleOpenFolder}
              onOpenWorkspace={handleOpenWorkspaceFile}
              onDropItem={(paths) => {
                void handleDroppedFolders(paths, true);
              }}
              onSelectRecentItem={handleSelectRecentItem}
              recentItems={recentItems}
              isDragOver={isEditorDragOver}
              dragClassificationType={dragClassificationType}
            />
          ) : (
            <div
              className={`flex-1 flex flex-col min-h-0 transition-colors ${
                isEditorDragOver ? 'bg-zinc-50' : ''
              }`}
              onDragEnter={(e) => {
                if (!e.dataTransfer.types.includes('Files')) {
                  return;
                }
                e.preventDefault();
                setIsEditorDragOver(true);
              }}
              onDragOver={(e) => {
                if (!e.dataTransfer.types.includes('Files')) {
                  return;
                }
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                setIsEditorDragOver(true);
              }}
              onDragLeave={(e) => {
                if (e.currentTarget === e.target) {
                  setIsEditorDragOver(false);
                }
              }}
              onDrop={(e) => {
                if (!e.dataTransfer.types.includes('Files')) {
                  return;
                }
                e.preventDefault();
                setIsEditorDragOver(false);
                const paths = extractDroppedPaths(
                  e.dataTransfer.files as FileList & {
                    [index: number]: File & { path?: string };
                  },
                );
                void handleDroppedFolders(paths, e.metaKey || e.ctrlKey);
              }}
            >
              <EditorDropBlockedOverlay isVisible={isEditorDropBlocked} />
              {isEditorDragOver ? (
                <DragDropHint
                  label={
                    dragClassificationType === 'folders'
                      ? t('fileDrop.openWorkspace')
                      : t('fileDrop.openFile')
                  }
                />
              ) : null}
              <Editor
                isTypewriterActive={isTypewriterActive}
                viewportTier={tier}
                isFocusZen={isFocusZen}
                isHeaderAwake={isHeaderAwake}
                onSetFocusZen={chrome.actions.setFocusZen}
              />
            </div>
          )}
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
      <RecentWorkspacesMenu
        isOpen={isRecentMenuOpen}
        onSelectWorkspace={handleSelectWorkspace}
        onSelectFolder={handleSelectFolder}
        onSelectFile={handleSelectFile}
        onClose={closeRecentMenu}
      />
    </div>
  );
}

export default App;
