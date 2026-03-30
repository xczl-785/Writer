import { useCallback, useEffect, useRef, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { Editor } from '../domains/editor/core/Editor';
import { StateDebug } from '../ui/StateDebug';
import { Sidebar } from '../ui/sidebar/Sidebar';
import {
  getWorkspaceContext,
  useWorkspaceStore,
} from '../domains/workspace/state/workspaceStore';
import { useEditorStore } from '../domains/editor/state/editorStore';
import { useStatusStore } from '../state/slices/statusSlice';
import { useNotificationStore } from '../state/slices/notificationSlice';
import { useSettingsStore } from '../domains/settings/state/settingsStore';
import { useViewModeStore } from '../state/slices/viewModeSlice';
import { StatusBar } from '../ui/statusbar/StatusBar';
import { AutosaveService } from '../domains/file/services/AutosaveService';
import { FsService } from '../domains/file/services/FsService';
import { scheduleTauriBridgeWarmup } from '../services/runtime/TauriWarmup';
import {
  getInitialFilePath,
  listenFileOpen,
} from '../services/startup/StartupService';
import { ErrorService } from '../services/error/ErrorService';
import { showLevel2Notification } from '../services/error/level2Notification';
import { createRetryAction } from '../services/error/retryActions';
import { useNativeMenuBridge } from './useNativeMenuBridge';
import { RecentWorkspacesMenu } from '../ui/components/RecentWorkspaces/RecentWorkspacesMenu';
import {
  DragDropHint,
  EditorDropBlockedOverlay,
} from '../ui/components/ErrorStates';
import { EmptyStateWorkspace } from '../ui/workspace/EmptyStateWorkspace';
import {
  RECENT_ITEMS_CHANGED_EVENT,
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
  registerHelpCommands,
} from './commands';
import { SettingsPanel } from '../ui/components/Settings';
import { AboutWriterPanel } from '../ui/components/About';
import { useViewportTier } from '../ui/layout/useViewportTier';
import { useFocusZenWakeup } from '../ui/layout/useFocusZenWakeup';
import { AppChrome } from './AppChrome';
import { NotificationHost } from '../ui/notifications/NotificationHost';
import { createAppChromeModel } from '../ui/chrome/chromeState';
import { getWorkspaceIndicatorLabel } from '../ui/statusbar/workspaceIndicator';
import {
  addFolderToWorkspaceByDialog,
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

const OPEN_RECENT_ITEM_EVENT = 'writer:open-recent-item';
const CLEAR_RECENT_ITEMS_EVENT = 'writer:clear-recent-items';

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
  const { folders, activeFile, workspaceFile, isDirty } = useWorkspaceStore();
  const workspaceContext = getWorkspaceContext({
    folders,
    activeFile,
    openFiles: [],
    workspaceFile,
    isDirty,
  });
  const hasWorkspace = workspaceContext !== 'none';
  const hasOpenFile = activeFile !== null;
  const currentPath = folders[0]?.path;
  const workspaceName = getWorkspaceIndicatorLabel({
    folders,
    workspaceFile,
    isDirty,
  });
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
  const [isAboutOpen, setIsAboutOpen] = useState(false);
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

  const showLevel2AppError = useCallback(
    (
      error: unknown,
      source: string,
      reason: string,
      suggestion: string,
      dedupeKey = source,
      retryAction?: () => void,
    ) => {
      showLevel2Notification({
        error,
        source,
        reason,
        suggestion,
        dedupeKey,
        actions: retryAction ? [createRetryAction(retryAction)] : undefined,
      });
    },
    [],
  );

  const showCloseFailureBanner = useCallback((error: unknown) => {
    useStatusStore.getState().setStatus('idle', null);
    ErrorService.handleWithInfo(error, 'window-close', {
      level: 'level3',
      source: 'window-close',
      reason: t('close.saveChangesFailed'),
      suggestion: getForceCloseHint(),
      dedupeKey: 'window-close:save-failed',
      actions: [
        {
          label: t('close.closeAnyway'),
          run: () => {
            forceCloseRequestedRef.current = true;
            void getCurrentWindow().close();
          },
        },
      ],
    });
  }, []);

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
        if (!hasOpenFile) {
          useStatusStore
            .getState()
            .setStatus('error', t('status.menu.focusZenNoFile'));
          return;
        }
        setIsSidebarVisible(false);
        enterZen(typewriterEnabledByUser);
      }
      setFocusZen(enabled);
      setFocusZenEnabledByUser(enabled);
    },
    [
      enterZen,
      setFocusZen,
      setFocusZenEnabledByUser,
      typewriterEnabledByUser,
      hasOpenFile,
    ],
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
  const openAbout = useCallback(() => setIsAboutOpen(true), []);
  const closeAbout = useCallback(() => setIsAboutOpen(false), []);
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
  const handleAddFolderToWorkspace = useCallback(async () => {
    await addFolderToWorkspaceByDialog();
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
  const handleSelectWorkspace = useCallback(
    async (path: string) => {
      try {
        useStatusStore.getState().setStatus('loading', t('workspace.loading'));
        const result = await workspaceActions.loadWorkspaceFile(path);
        if (result.ok) {
          useNotificationStore.getState().dismissLevel2();
          await RecentItemsService.addWorkspace(path);
          useStatusStore.getState().setStatus('idle');
        } else {
          showLevel2AppError(
            new Error(result.errorMessage),
            'app-recent-workspace',
            result.errorMessage,
            t('workspace.openWorkspaceRetrySuggestion'),
            `app-recent-workspace:${path}`,
            () => {
              void handleSelectWorkspace(path);
            },
          );
        }
      } catch (error) {
        showLevel2AppError(
          error,
          'app-recent-workspace',
          t('workspace.openWorkspaceFailed'),
          t('workspace.openWorkspaceRetrySuggestion'),
          `app-recent-workspace:${path}`,
          () => {
            void handleSelectWorkspace(path);
          },
        );
      }
    },
    [showLevel2AppError],
  );

  const handleSelectFolder = useCallback(
    async (path: string) => {
      try {
        useStatusStore.getState().setStatus('loading', t('workspace.loading'));
        await workspaceActions.loadWorkspace(path);
        useNotificationStore.getState().dismissLevel2();
        await RecentItemsService.addFolder(path);
        useStatusStore.getState().setStatus('idle');
      } catch (error) {
        showLevel2AppError(
          error,
          'app-recent-folder',
          t('workspace.openFolderFailed'),
          t('workspace.openFolderRetrySuggestion'),
          `app-recent-folder:${path}`,
          () => {
            void handleSelectFolder(path);
          },
        );
      }
    },
    [showLevel2AppError],
  );

  const handleSelectFile = useCallback(
    async (path: string) => {
      try {
        useStatusStore.getState().setStatus('loading', t('file.opening'));
        const result = await workspaceActions.openFile(path);
        if (result.ok) {
          useNotificationStore.getState().dismissLevel2();
          await RecentItemsService.addFile(path);
          useStatusStore.getState().setStatus('idle');
        } else {
          showLevel2AppError(
            new Error(result.reason),
            'app-recent-file',
            t('file.openFailed'),
            t('workspace.openRetrySuggestion'),
            `app-recent-file:${path}:${result.reason}`,
            () => {
              void handleSelectFile(path);
            },
          );
        }
      } catch (error) {
        showLevel2AppError(
          error,
          'app-recent-file',
          t('file.openFailed'),
          t('workspace.openRetrySuggestion'),
          `app-recent-file:${path}`,
          () => {
            void handleSelectFile(path);
          },
        );
      }
    },
    [showLevel2AppError],
  );
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
    function handleRecentItemsChanged(): void {
      void refreshRecentItems();
    }

    function handleOpenRecentItem(event: Event): void {
      const detail = (event as CustomEvent<RecentItem>).detail;
      if (!detail) {
        return;
      }
      void handleSelectRecentItem(detail);
    }

    function handleClearRecentItems(): void {
      void RecentItemsService.clearAll();
    }

    window.addEventListener(
      RECENT_ITEMS_CHANGED_EVENT,
      handleRecentItemsChanged,
    );
    window.addEventListener(
      OPEN_RECENT_ITEM_EVENT,
      handleOpenRecentItem as EventListener,
    );
    window.addEventListener(CLEAR_RECENT_ITEMS_EVENT, handleClearRecentItems);

    return () => {
      window.removeEventListener(
        RECENT_ITEMS_CHANGED_EVENT,
        handleRecentItemsChanged,
      );
      window.removeEventListener(
        OPEN_RECENT_ITEM_EVENT,
        handleOpenRecentItem as EventListener,
      );
      window.removeEventListener(
        CLEAR_RECENT_ITEMS_EVENT,
        handleClearRecentItems,
      );
    };
  }, [handleSelectRecentItem, refreshRecentItems]);

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

  const openFileFromPath = useCallback(
    async (filePath: string) => {
      const exists = await FsService.checkExists(filePath);
      if (!exists) {
        showLevel2AppError(
          new Error('File not found'),
          'startup-file-open',
          t('fileDrop.fileNotFound'),
          t('fileDrop.openFailed'),
          `startup-file-open:${filePath}:missing`,
          () => {
            void openFileFromPath(filePath);
          },
        );
        return;
      }

      const result = await workspaceActions.openFile(filePath);
      if (result.ok) {
        useNotificationStore.getState().dismissLevel2();
        useStatusStore.getState().setStatus('idle', t('fileDrop.openSuccess'));
      } else {
        showLevel2AppError(
          new Error(result.reason || t('fileDrop.openFailed')),
          'startup-file-open',
          t('fileDrop.openFailed'),
          t('workspace.openRetrySuggestion'),
          `startup-file-open:${filePath}:${result.reason ?? 'unknown'}`,
          () => {
            void openFileFromPath(filePath);
          },
        );
      }
    },
    [showLevel2AppError],
  );

  useEffect(() => {
    let unlisten: UnlistenFn | undefined;
    let mounted = true;

    const setup = async () => {
      try {
        const filePath = await getInitialFilePath();
        if (mounted && filePath) {
          await openFileFromPath(filePath);
        }

        unlisten = await listenFileOpen((path) => {
          if (mounted) {
            void openFileFromPath(path);
          }
        });
      } catch (error) {
        console.error('Failed to setup file open listener:', error);
      }
    };

    void setup();

    return () => {
      mounted = false;
      unlisten?.();
    };
  }, [openFileFromPath]);

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
      registerHelpCommands(openAbout),
    ];

    return () => {
      unregister.forEach((fn) => fn());
    };
  }, [
    isSidebarVisible,
    openSettings,
    toggleSidebar,
    openRecentMenu,
    openAbout,
  ]);

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

            useNotificationStore.getState().dismissLevel3();
            isProgrammaticCloseRef.current = true;
            forceCloseRequestedRef.current = false;
            await appWindow.close();
          } catch (error) {
            showCloseFailureBanner(error);
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
  }, [showCloseFailureBanner]);

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
          <NotificationHost scope="editor" />
          {workspaceContext === 'none' && !hasOpenFile ? (
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
              mode="welcome"
            />
          ) : workspaceContext === 'saved-empty' ? (
            <EmptyStateWorkspace
              onOpenFolder={handleOpenFolder}
              onOpenWorkspace={handleOpenWorkspaceFile}
              onPrimaryAction={() => {
                void handleAddFolderToWorkspace();
              }}
              onSecondaryAction={() => {
                void workspaceActions.closeWorkspace();
              }}
              onDropItem={(paths) => {
                void handleDroppedFolders(paths, false);
              }}
              isDragOver={isEditorDragOver}
              dragClassificationType={dragClassificationType}
              mode="saved-empty"
              workspaceName={workspaceName}
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
      <NotificationHost scope="global" />
      <StatusBar isFocusZen={isFocusZen} isVisibleInFocusZen={isFooterAwake} />
      <SettingsPanel
        isOpen={isSettingsOpen}
        viewportTier={tier}
        localePreference={localePreference}
        onLocalePreferenceChange={handleLocalePreferenceChange}
        onClose={closeSettings}
      />
      <AboutWriterPanel
        isOpen={isAboutOpen}
        viewportTier={tier}
        onClose={closeAbout}
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
