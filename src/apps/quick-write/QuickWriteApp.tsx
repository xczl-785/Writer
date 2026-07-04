import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  reduceSingleDocumentSessionShell,
  selectSingleDocumentSessionShellView,
  type RecoveryDraftEditorState,
  type SingleDocumentSessionShellEvent,
  type SingleDocumentSessionShellState,
} from '../../core/session';
import {
  QuickWriteEditor,
  type QuickWriteEditorHandle,
} from './QuickWriteEditor';
import { QuickWriteAppShell } from './QuickWriteAppShell';
import { useSettingsStore } from '../../domains/settings/state/settingsStore';
import { type QuickWriteCommand } from './quickWriteCommands';
import { QuickWriteMenuAdapter } from './QuickWriteMenuAdapter';
import {
  QuickWriteStatusBar,
  countQuickWriteCharacters,
} from './QuickWriteStatusBar';
import { useQuickWriteNativeMenuBridge } from './quickWriteNativeMenu';
import {
  SaveScheduler,
  type SaveSchedulerInput,
} from '../../core/autosave/SaveScheduler';
import { createAppChromeModel } from '../../ui/chrome/chromeState';
import { EDITOR_CONFIG } from '../../config/editor';
import {
  useStatusStore,
  type SaveErrorDetails,
  type SaveStatus,
} from '../../state/slices/statusSlice';
import {
  createQuickWriteRuntimeAdapter,
  type QuickWriteOpenedFile,
  type QuickWriteRuntimeAdapter,
} from './quickWriteRuntime';
import { getQuickWriteTemplateById } from './quickWriteTemplates';
import type { SettingsLocalePreference } from '../../domains/settings/state/settingsStore';
import { SettingsPanel } from '../../ui/components/Settings';
import './QuickWriteApp.css';

interface QuickWriteAppProps {
  runtime?: QuickWriteRuntimeAdapter;
}

type QuickWriteOperationPhase =
  | 'startup'
  | 'saveTo'
  | 'exportHtml'
  | 'printToPdf'
  | 'open'
  | 'close'
  | 'newWindow';
interface QuickWriteOperationError {
  phase: QuickWriteOperationPhase | null;
  error: unknown;
}

type QuickWriteLocale = 'zh-CN' | 'en-US';
type QuickWriteShellStyle = CSSProperties & Record<`--${string}`, string>;
const QUICK_WRITE_STARTUP_FALLBACK_RECOVERY_PATH =
  'quickwrite://startup-fallback-draft';

type QuickWriteAutosaveInput = SaveSchedulerInput & {
  contentVersion: number;
  draftId: string | null;
  targetKind: 'file' | 'recovery';
};

interface QuickWriteCopy {
  autosavePending: string;
  autosaving: string;
  disabledDocumentAlreadyClosed: string;
  disabledNoEditableDocument: string;
  documentClosedTooltip: string;
  documentKind: {
    closed: string;
    draft: string;
    file: string;
  };
  documentStatus: {
    closed: string;
    dirty: string;
    empty: string;
    open: string;
  };
  draftLabel: string;
  draftStatusTooltip: string;
  filePath: string;
  filePathUnavailable: string;
  menu: {
    disabled: Partial<Record<QuickWriteCommand, string>>;
  };
  noDocumentTooltip: string;
  operationActivity: Record<QuickWriteOperationPhase, string>;
  operationFailed: string;
  operationFailure: Record<QuickWriteOperationPhase | 'unknown', string>;
  pleaseWait: string;
  quickWriteBusy: string;
  saveFailed: string;
  statusAriaLabels: {
    documentStatus: string;
    saveStatus: string;
  };
  unsavedEdits: string;
}

const QUICK_WRITE_COPY: Record<QuickWriteLocale, QuickWriteCopy> = {
  'en-US': {
    autosavePending: 'Autosave pending',
    autosaving: 'Autosaving...',
    disabledDocumentAlreadyClosed: 'The QuickWrite document is already closed',
    disabledNoEditableDocument: 'No editable QuickWrite document is active',
    documentClosedTooltip: 'Document closed',
    documentKind: {
      closed: 'Closed',
      draft: 'Draft',
      file: 'File',
    },
    documentStatus: {
      closed: 'Closed',
      dirty: 'Dirty',
      empty: 'Empty',
      open: 'Open',
    },
    draftLabel: 'Draft',
    draftStatusTooltip: 'Draft mode: autosaving to QuickWrite recovery',
    filePath: 'File path',
    filePathUnavailable: 'File path unavailable',
    menu: {
      disabled: {
        'file.exit': 'Native QuickWrite app lifecycle is not available yet',
        'file.newWindow':
          'Native QuickWrite window runtime is not available yet',
      },
    },
    noDocumentTooltip: 'No QuickWrite document is open',
    operationActivity: {
      close: 'Closing document...',
      newWindow: 'Opening new window...',
      exportHtml: 'Exporting HTML...',
      printToPdf: 'Opening system PDF print dialog...',
      open: 'Opening file...',
      saveTo: 'Saving to file...',
      startup: 'Starting QuickWrite...',
    },
    operationFailed: 'Operation failed',
    operationFailure: {
      close: 'Close failed',
      newWindow: 'New window failed',
      exportHtml: 'HTML export failed',
      printToPdf: 'PDF print failed',
      open: 'Open failed',
      saveTo: 'Save To failed',
      startup: 'Startup failed',
      unknown: 'Operation failed',
    },
    pleaseWait: 'Please wait.',
    quickWriteBusy: 'QuickWrite is busy',
    saveFailed: 'Save failed',
    statusAriaLabels: {
      documentStatus: 'QuickWrite document status',
      saveStatus: 'QuickWrite save status',
    },
    unsavedEdits: 'Unsaved edits',
  },
  'zh-CN': {
    autosavePending: '自动保存待处理',
    autosaving: '正在自动保存...',
    disabledDocumentAlreadyClosed: '随手写文档已经关闭',
    disabledNoEditableDocument: '当前没有可编辑的随手写文档',
    documentClosedTooltip: '文档已关闭',
    documentKind: {
      closed: '已关闭',
      draft: '草稿',
      file: '文件',
    },
    documentStatus: {
      closed: '已关闭',
      dirty: '未保存',
      empty: '空',
      open: '已打开',
    },
    draftLabel: '草稿',
    draftStatusTooltip: '草稿模式：正在自动保存到随手写恢复区',
    filePath: '文件路径',
    filePathUnavailable: '文件路径不可用',
    menu: {
      disabled: {
        'file.exit': '原生随手写应用生命周期尚不可用',
        'file.newWindow': '原生随手写窗口运行时尚不可用',
      },
    },
    noDocumentTooltip: '没有打开随手写文档',
    operationActivity: {
      close: '正在关闭文档...',
      exportHtml: '正在导出 HTML...',
      printToPdf: '正在打开系统 PDF 打印对话框...',
      newWindow: '正在打开新窗口...',
      open: '正在打开文件...',
      saveTo: '正在保存到文件...',
      startup: '正在启动随手写...',
    },
    operationFailed: '操作失败',
    operationFailure: {
      close: '关闭失败',
      exportHtml: 'HTML 导出失败',
      printToPdf: 'PDF 打印失败',
      newWindow: '新窗口打开失败',
      open: '打开失败',
      saveTo: '保存到失败',
      startup: '启动失败',
      unknown: '操作失败',
    },
    pleaseWait: '请稍候。',
    quickWriteBusy: '随手写正忙',
    saveFailed: '保存失败',
    statusAriaLabels: {
      documentStatus: '随手写文档状态',
      saveStatus: '随手写保存状态',
    },
    unsavedEdits: '未保存编辑',
  },
};

const QUICK_WRITE_EDITOR_FONT_SIZE: Record<string, string> = {
  default: '17px',
  large: '19px',
  small: '15px',
};

const QUICK_WRITE_THEME_VARIABLES = {
  dark: {
    '--quick-write-accent': '#fdba74',
    '--quick-write-bg-elevated': '#0f172a',
    '--quick-write-bg-primary': '#111827',
    '--quick-write-bg-secondary': '#1f2937',
    '--quick-write-border': '#334155',
    '--quick-write-error-bg': '#450a0a',
    '--quick-write-error-border': 'rgb(248 113 113 / 35%)',
    '--quick-write-focus-ring': 'rgb(96 165 250 / 20%)',
    '--quick-write-status-dirty': '#fbbf24',
    '--quick-write-status-failed': '#fca5a5',
    '--quick-write-status-saving': '#93c5fd',
    '--quick-write-text-primary': '#f8fafc',
    '--quick-write-text-secondary': '#cbd5e1',
  },
  light: {
    '--quick-write-accent': '#9a3412',
    '--quick-write-bg-elevated': '#ffffff',
    '--quick-write-bg-primary': '#f8fafc',
    '--quick-write-bg-secondary': '#eef2f7',
    '--quick-write-border': '#cbd5e1',
    '--quick-write-error-bg': '#fef2f2',
    '--quick-write-error-border': 'rgb(220 38 38 / 30%)',
    '--quick-write-focus-ring': 'rgb(37 99 235 / 16%)',
    '--quick-write-status-dirty': '#92400e',
    '--quick-write-status-failed': '#991b1b',
    '--quick-write-status-saving': '#1d4ed8',
    '--quick-write-text-primary': '#111827',
    '--quick-write-text-secondary': '#475569',
  },
} satisfies Record<
  'dark' | 'light',
  Omit<QuickWriteShellStyle, keyof CSSProperties>
>;

function reduceQuickWriteShell(
  state: SingleDocumentSessionShellState,
  event: SingleDocumentSessionShellEvent,
) {
  return reduceSingleDocumentSessionShell(state, event);
}

export function QuickWriteApp({ runtime }: QuickWriteAppProps) {
  const quickWriteRuntime = useMemo(
    () => runtime ?? createQuickWriteRuntimeAdapter(),
    [runtime],
  );
  const initialState = useMemo(
    () => quickWriteRuntime.createInitialState(),
    [quickWriteRuntime],
  );
  const activeDraftIdRef = useRef<string | null>(null);
  const restoredEditorStateRef = useRef<RecoveryDraftEditorState | undefined>(
    undefined,
  );
  const stateRef = useRef(initialState);
  const editorRef = useRef<QuickWriteEditorHandle | null>(null);
  const operationPhaseRef = useRef<QuickWriteOperationPhase | null>('startup');
  const [operationError, setOperationError] =
    useState<QuickWriteOperationError | null>(null);
  const [operationPhase, setOperationPhase] =
    useState<QuickWriteOperationPhase | null>('startup');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEditorLoading, setIsEditorLoading] = useState(false);
  const [state, dispatch] = useReducer(reduceQuickWriteShell, initialState);
  const themePreference = useSettingsStore((item) => item.themePreference);
  const editorFontSize = useSettingsStore((item) => item.editorFontSize);
  const localePreference = useSettingsStore((item) => item.localePreference);
  const setLocalePreference = useSettingsStore(
    (item) => item.setLocalePreference,
  );
  const quickWriteSaveStatus = useStatusStore((item) => item.saveStatus);
  const quickWriteSaveError = useStatusStore((item) => item.saveError);
  const quickWriteStatusMessage = useStatusStore((item) => item.message);
  const locale = resolveQuickWriteLocale(localePreference);
  const copy = QUICK_WRITE_COPY[locale];
  const shellStyle = useMemo<QuickWriteShellStyle>(() => {
    const themeVariables =
      themePreference === 'light' || themePreference === 'dark'
        ? QUICK_WRITE_THEME_VARIABLES[themePreference]
        : {};
    return {
      ...themeVariables,
      '--quick-write-editor-font-size':
        QUICK_WRITE_EDITOR_FONT_SIZE[editorFontSize],
    };
  }, [editorFontSize, themePreference]);
  const dispatchShell = useCallback(
    (event: SingleDocumentSessionShellEvent) => {
      stateRef.current = reduceQuickWriteShell(stateRef.current, event);
      dispatch(event);
    },
    [],
  );
  const autosaveScheduler = useMemo(
    () =>
      new SaveScheduler(EDITOR_CONFIG.autosave.debounceMs, {
        save: async (input: SaveSchedulerInput) => {
          const quickWriteInput = input as QuickWriteAutosaveInput;
          await quickWriteRuntime.savePendingDocument({
            targetKind: quickWriteInput.targetKind,
            path: quickWriteInput.path,
            draftId: quickWriteInput.draftId,
            content: quickWriteInput.content,
            contentVersion: quickWriteInput.contentVersion,
            ...(quickWriteInput.targetKind === 'recovery'
              ? { editorState: editorRef.current?.getEditorStateSnapshot() }
              : {}),
          });
        },
        onScheduled: () => {
          useStatusStore.getState().markDirty();
        },
        onSaveStarted: ({ path }) => {
          dispatchShell({ type: 'requestSave' });
          useStatusStore.getState().markSaving(path);
        },
        onSaveSucceeded: (input) => {
          const quickWriteInput = input as QuickWriteAutosaveInput;
          dispatchShell({
            type: 'saveSettled',
            result: {
              ok: true,
              target: { path: quickWriteInput.path },
              contentVersion: quickWriteInput.contentVersion,
              savedAt: Date.now(),
            },
          });
          useStatusStore.getState().markSaved('Saved');
        },
        onSaveFailed: (input, error) => {
          const quickWriteInput = input as QuickWriteAutosaveInput;
          dispatchShell({
            type: 'saveSettled',
            result: {
              ok: false,
              target: { path: quickWriteInput.path },
              contentVersion: quickWriteInput.contentVersion,
              error,
              failedAt: Date.now(),
            },
          });
          useStatusStore
            .getState()
            .markSaveFailed(`Failed to save ${quickWriteInput.path}`);
        },
      }),
    [dispatchShell, quickWriteRuntime],
  );
  const view = selectSingleDocumentSessionShellView(state);
  stateRef.current = state;
  operationPhaseRef.current = operationPhase;
  const isBusy = operationPhase !== null;
  const isEditorDisabled =
    isBusy ||
    isEditorLoading ||
    view.documentKind === 'closed' ||
    view.documentKind === 'empty';
  const documentTitle = getQuickWriteDocumentTitle(view, copy);
  const statusModel = getQuickWriteStatusModel({
    copy,
    documentKind: view.documentKind,
    isDirty: view.isDirty,
    lastSaveError: view.lastSaveError,
    operationError,
    operationPhase,
    pendingSave: view.pendingSave !== null,
    path: view.documentPath,
  });
  const chrome = useMemo(
    () =>
      createAppChromeModel({
        hasRecentItems: false,
        isFocusZen: false,
        isHeaderAwake: true,
        isSidebarVisible: false,
        showSidebarToggle: false,
        onSetFocusZen: () => {},
        onSetSidebarVisible: () => {},
        onToggleSidebar: () => {},
      }),
    [],
  );
  const statusBarDisplayStatus =
    getQuickWriteStatusBarDisplayStatus(quickWriteSaveStatus);
  const statusBarError = getQuickWriteStatusBarError({
    copy,
    operationError,
    saveError: quickWriteSaveError,
    statusMessage: quickWriteStatusMessage,
    statusModel,
  });
  const statusBarMessage = getQuickWriteStatusBarMessage({
    copy,
    documentKind: view.documentKind,
    statusModel,
  });

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    useStatusStore.setState({
      status: 'idle',
      message: null,
      saveStatus: 'saved',
      saveError: null,
      lastSavedAt: null,
    });
  }, []);

  const beginOperation = useCallback((phase: QuickWriteOperationPhase) => {
    if (operationPhaseRef.current !== null) {
      return false;
    }
    operationPhaseRef.current = phase;
    setOperationPhase(phase);
    return true;
  }, []);

  const endOperation = useCallback((phase: QuickWriteOperationPhase) => {
    if (operationPhaseRef.current !== phase) {
      return;
    }
    operationPhaseRef.current = null;
    setOperationPhase(null);
  }, []);

  const synchronizeEditorMarkdownSnapshot =
    useCallback(async (): Promise<void> => {
      const markdown = await editorRef.current?.getMarkdownSnapshot();
      if (markdown === undefined || markdown === stateRef.current.content) {
        return;
      }
      dispatchShell({ type: 'editDocument', content: markdown });
    }, [dispatchShell]);

  const scheduleCurrentDocumentSave = useCallback(
    (current: SingleDocumentSessionShellState = stateRef.current) => {
      const input = createQuickWriteAutosaveInput(
        current,
        activeDraftIdRef.current,
      );
      if (!input) {
        return null;
      }
      autosaveScheduler.scheduleInput(input);
      return input.path;
    },
    [autosaveScheduler],
  );

  const flushCurrentDocument = useCallback(async (): Promise<boolean> => {
    await synchronizeEditorMarkdownSnapshot();
    const current = stateRef.current;
    if (
      current.session.recoveryPath ===
      QUICK_WRITE_STARTUP_FALLBACK_RECOVERY_PATH
    ) {
      return true;
    }

    if (
      current.session.status === 'dirty' ||
      current.session.contentVersion !== current.session.savedVersion
    ) {
      scheduleCurrentDocumentSave(current);
    }

    const input = createQuickWriteAutosaveInput(
      stateRef.current,
      activeDraftIdRef.current,
    );
    if (!input || !autosaveScheduler.isPending(input.path)) {
      return true;
    }
    try {
      await autosaveScheduler.flush(input.path);
    } catch {
      return false;
    }
    return true;
  }, [
    autosaveScheduler,
    scheduleCurrentDocumentSave,
    synchronizeEditorMarkdownSnapshot,
  ]);

  const handleSaveTo = useCallback(async () => {
    if (!beginOperation('saveTo')) {
      return;
    }
    setOperationError(null);
    try {
      const targetPath = await quickWriteRuntime.selectSaveTarget();
      if (!targetPath) {
        return;
      }

      if (!(await flushCurrentDocument())) {
        setOperationError({
          phase: 'saveTo',
          error: stateRef.current.lastSaveError ?? new Error('Save failed'),
        });
        return;
      }
      const current = stateRef.current;
      const draftId = activeDraftIdRef.current;
      useStatusStore.getState().markSaving(targetPath);
      await quickWriteRuntime.savePendingDocument({
        targetKind: 'file',
        path: targetPath,
        content: current.content,
        contentVersion: current.session.contentVersion,
      });
      if (draftId) {
        await quickWriteRuntime.markDraftPromoted(draftId);
      }
      activeDraftIdRef.current = null;
      restoredEditorStateRef.current = undefined;
      dispatchShell({
        type: 'openDocument',
        path: targetPath,
        content: current.content,
        contentVersion: current.session.contentVersion,
      });
      useStatusStore.getState().markSaved('Saved');
    } catch (error: unknown) {
      setOperationError({ phase: 'saveTo', error });
      useStatusStore
        .getState()
        .markSaveFailed(`Failed to save ${copy.filePath}`);
    } finally {
      endOperation('saveTo');
    }
  }, [
    beginOperation,
    copy.filePath,
    dispatchShell,
    endOperation,
    flushCurrentDocument,
    quickWriteRuntime,
  ]);

  const handleExportHtml = useCallback(async () => {
    if (!beginOperation('exportHtml')) {
      return;
    }
    setOperationError(null);
    try {
      const targetPath = await quickWriteRuntime.selectHtmlExportTarget();
      if (!targetPath) {
        return;
      }

      if (!(await flushCurrentDocument())) {
        setOperationError({
          phase: 'exportHtml',
          error: stateRef.current.lastSaveError ?? new Error('Save failed'),
        });
        return;
      }

      const htmlBody = editorRef.current?.getHtmlSnapshot() ?? '';
      await quickWriteRuntime.exportHtmlFile({
        path: targetPath,
        html: buildQuickWriteHtmlDocument({
          body: htmlBody,
          title: documentTitle,
        }),
      });
    } catch (error: unknown) {
      setOperationError({ phase: 'exportHtml', error });
    } finally {
      endOperation('exportHtml');
    }
  }, [
    beginOperation,
    documentTitle,
    endOperation,
    flushCurrentDocument,
    quickWriteRuntime,
  ]);

  const handlePrintToPdf = useCallback(async () => {
    if (isEditorDisabled) {
      return;
    }
    if (!beginOperation('printToPdf')) {
      return;
    }
    setOperationError(null);
    try {
      if (!(await flushCurrentDocument())) {
        setOperationError({
          phase: 'printToPdf',
          error: stateRef.current.lastSaveError ?? new Error('Save failed'),
        });
        return;
      }

      await quickWriteRuntime.printDocument();
    } catch (error: unknown) {
      setOperationError({ phase: 'printToPdf', error });
    } finally {
      endOperation('printToPdf');
    }
  }, [
    beginOperation,
    endOperation,
    flushCurrentDocument,
    isEditorDisabled,
    quickWriteRuntime,
  ]);

  const commitOpenedFile = useCallback(
    (opened: QuickWriteOpenedFile) => {
      activeDraftIdRef.current = null;
      restoredEditorStateRef.current = undefined;
      dispatchShell({
        type: 'openDocument',
        path: opened.path,
        content: opened.content,
      });
    },
    [dispatchShell],
  );

  const openFileBackedDocument = useCallback(
    async (path: string) => {
      commitOpenedFile(await quickWriteRuntime.openFilePath(path));
    },
    [commitOpenedFile, quickWriteRuntime],
  );

  const handleOpen = useCallback(async () => {
    if (!beginOperation('open')) {
      return;
    }
    setOperationError(null);
    try {
      if (!(await flushCurrentDocument())) {
        return;
      }

      const opened = await quickWriteRuntime.openMarkdownFile();
      if (!opened) {
        return;
      }
      commitOpenedFile(opened);
    } catch (error: unknown) {
      setOperationError({ phase: 'open', error });
    } finally {
      endOperation('open');
    }
  }, [
    beginOperation,
    commitOpenedFile,
    endOperation,
    flushCurrentDocument,
    quickWriteRuntime,
  ]);

  const handleRuntimeFileOpen = useCallback(
    async (path: string) => {
      if (!beginOperation('open')) {
        return;
      }
      setOperationError(null);
      try {
        if (!(await flushCurrentDocument())) {
          return;
        }

        await openFileBackedDocument(path);
      } catch (error: unknown) {
        setOperationError({ phase: 'open', error });
      } finally {
        endOperation('open');
      }
    },
    [
      beginOperation,
      endOperation,
      flushCurrentDocument,
      openFileBackedDocument,
    ],
  );

  const handleCloseWindow = useCallback(async () => {
    if (!beginOperation('close')) {
      return;
    }
    setOperationError(null);
    try {
      if (!(await flushCurrentDocument())) {
        return;
      }

      await getCurrentWindow().close();
    } catch (error: unknown) {
      setOperationError({ phase: 'close', error });
    } finally {
      endOperation('close');
    }
  }, [beginOperation, endOperation, flushCurrentDocument]);

  const openSettings = useCallback(() => setIsSettingsOpen(true), []);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);
  const handleLocalePreferenceChange = useCallback(
    (preference: SettingsLocalePreference) => {
      setLocalePreference(preference);
    },
    [setLocalePreference],
  );

  const handleNewWindow = useCallback(async () => {
    if (!beginOperation('newWindow')) {
      return;
    }
    setOperationError(null);
    try {
      await quickWriteRuntime.openNewTemporaryDocumentWindow();
    } catch (error: unknown) {
      setOperationError({ phase: 'newWindow', error });
    } finally {
      endOperation('newWindow');
    }
  }, [beginOperation, endOperation, quickWriteRuntime]);

  const updateEditorContent = useCallback(
    (content: string) => {
      if (operationPhaseRef.current !== null || isEditorDisabled) {
        return;
      }
      if (content === stateRef.current.content) {
        return;
      }
      setOperationError(null);
      dispatchShell({ type: 'editDocument', content });
      if (
        stateRef.current.session.recoveryPath !==
        QUICK_WRITE_STARTUP_FALLBACK_RECOVERY_PATH
      ) {
        scheduleCurrentDocumentSave(stateRef.current);
      }
    },
    [dispatchShell, isEditorDisabled, scheduleCurrentDocumentSave],
  );

  const handleEditorCommand = useCallback(
    (command: QuickWriteCommand) => {
      const editor = editorRef.current;
      if (!editor || isEditorDisabled) {
        return;
      }

      editor.runCommand(command);
    },
    [isEditorDisabled],
  );

  const handleMenuCommand = useCallback(
    (command: QuickWriteCommand) => {
      switch (command) {
        case 'file.open':
          void handleOpen();
          return;
        case 'file.saveTo':
          void handleSaveTo();
          return;
        case 'file.exportHtml':
          void handleExportHtml();
          return;
        case 'file.printToPdf':
          void handlePrintToPdf();
          return;
        case 'file.close':
          void handleCloseWindow();
          return;
        case 'file.settings':
          openSettings();
          return;
        case 'file.newWindow':
          void handleNewWindow();
          return;
        case 'file.exit':
          return;
        default:
          handleEditorCommand(command);
      }
    },
    [
      handleCloseWindow,
      handleEditorCommand,
      handleExportHtml,
      handlePrintToPdf,
      handleNewWindow,
      handleOpen,
      handleSaveTo,
      openSettings,
    ],
  );

  useQuickWriteNativeMenuBridge(handleMenuCommand);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let isCancelled = false;

    void quickWriteRuntime
      .listenFileOpen((path) => {
        if (!isCancelled) {
          void handleRuntimeFileOpen(path);
        }
      })
      .then((unlisten) => {
        if (isCancelled) {
          unlisten();
          return;
        }
        cleanup = unlisten;
      })
      .catch((error: unknown) => {
        if (!isCancelled) {
          setOperationError({ phase: 'open', error });
        }
      });

    return () => {
      isCancelled = true;
      cleanup?.();
    };
  }, [handleRuntimeFileOpen, quickWriteRuntime]);

  useEffect(() => {
    let isCancelled = false;

    operationPhaseRef.current = 'startup';
    setOperationPhase('startup');
    const openInitialDocument = async () => {
      const freshDraftOptions = getFreshQuickWriteDraftOptions();
      if (freshDraftOptions) {
        const draft =
          await quickWriteRuntime.openNewRecoveryDraft(freshDraftOptions);
        return { kind: 'draft' as const, draft };
      }

      const initialFilePath = await quickWriteRuntime.getInitialFilePath();
      if (initialFilePath) {
        const opened = await quickWriteRuntime.openFilePath(initialFilePath);
        return { kind: 'file' as const, opened };
      }

      const draft = await quickWriteRuntime.openRecoveryDraft();
      return { kind: 'draft' as const, draft };
    };

    void openInitialDocument()
      .then((initialDocument) => {
        if (isCancelled) {
          return;
        }
        if (stateRef.current.session.status !== 'empty') {
          return;
        }

        if (initialDocument.kind === 'file') {
          activeDraftIdRef.current = null;
          restoredEditorStateRef.current = undefined;
          dispatchShell({
            type: 'openDocument',
            path: initialDocument.opened.path,
            content: initialDocument.opened.content,
          });
        } else {
          const { draft } = initialDocument;
          activeDraftIdRef.current = draft.metadata.draftId;
          restoredEditorStateRef.current = draft.metadata.editorState;
          dispatchShell({
            type: 'openTemporaryDocument',
            recoveryPath: draft.metadata.recoveryPath,
            content: draft.content,
            contentVersion: draft.metadata.contentVersion,
          });
        }
        endOperation('startup');
      })
      .catch((error: unknown) => {
        if (isCancelled) {
          return;
        }
        const startupError = error;
        setOperationError({ phase: 'startup', error: startupError });
        void quickWriteRuntime
          .openNewRecoveryDraft()
          .then((draft) => {
            if (isCancelled) {
              return;
            }
            activeDraftIdRef.current = draft.metadata.draftId;
            restoredEditorStateRef.current = draft.metadata.editorState;
            dispatchShell({
              type: 'openTemporaryDocument',
              recoveryPath: draft.metadata.recoveryPath,
              content: draft.content,
              contentVersion: draft.metadata.contentVersion,
            });
          })
          .catch(() => {
            if (isCancelled) {
              return;
            }
            activeDraftIdRef.current = null;
            restoredEditorStateRef.current = undefined;
            dispatchShell({
              type: 'openTemporaryDocument',
              recoveryPath: QUICK_WRITE_STARTUP_FALLBACK_RECOVERY_PATH,
              content: '',
            });
          })
          .finally(() => {
            if (!isCancelled) {
              endOperation('startup');
            }
          });
      });

    return () => {
      isCancelled = true;
    };
  }, [dispatchShell, endOperation, quickWriteRuntime]);

  return (
    <QuickWriteAppShell
      chrome={chrome}
      editorFontSize={editorFontSize}
      footer={
        <QuickWriteStatusBar
          activeError={statusBarError}
          charactersCount={countQuickWriteCharacters(state.content)}
          displayStatus={statusBarDisplayStatus}
          encodingLabel="UTF-8"
          message={statusBarMessage}
        />
      }
      locale={locale}
      localePreference={localePreference}
      menuBar={
        <div className="quick-write-title-menu">
          <QuickWriteMenuAdapter
            disabled={isBusy}
            hasEditableDocument={!isEditorDisabled}
            onCommand={handleMenuCommand}
          />
        </div>
      }
      shellStyle={shellStyle}
      themePreference={themePreference}
    >
      {operationError ? (
        <output
          aria-label="QuickWrite operation error"
          className="quick-write-error"
        >
          {getErrorMessage(operationError.error, copy)}
        </output>
      ) : null}

      <output
        aria-label={copy.statusAriaLabels.documentStatus}
        className="quick-write-sr-status"
      >
        {statusModel.documentStatus}
      </output>
      <output
        aria-label={copy.statusAriaLabels.saveStatus}
        className="quick-write-sr-status"
      >
        {statusModel.activityLabel}
      </output>
      <QuickWriteEditor
        disabled={isEditorDisabled}
        documentId={
          view.documentPath ??
          state.session.recoveryPath ??
          `quickwrite://${view.documentKind}`
        }
        draftLabel={copy.draftLabel}
        ref={editorRef}
        restoreState={restoredEditorStateRef.current}
        value={state.content}
        onMarkdownChange={updateEditorContent}
        onSaveShortcut={handleSaveTo}
        onLoadStateChange={setIsEditorLoading}
      />
      <SettingsPanel
        isOpen={isSettingsOpen}
        viewportTier="default"
        localePreference={localePreference}
        onLocalePreferenceChange={handleLocalePreferenceChange}
        onClose={closeSettings}
      />
    </QuickWriteAppShell>
  );
}

export default QuickWriteApp;

const getErrorMessage = (error: unknown, copy: QuickWriteCopy): string =>
  error instanceof Error ? error.message : copy.operationFailed;

const getQuickWriteDocumentTitle = (
  view: ReturnType<typeof selectSingleDocumentSessionShellView>,
  copy: QuickWriteCopy,
): string => {
  if (view.documentKind === 'file' && view.documentPath) {
    return getBaseName(view.documentPath);
  }
  if (view.documentKind === 'closed') {
    return copy.documentKind.closed;
  }
  return 'QuickWrite';
};

interface QuickWriteStatusInput {
  copy: QuickWriteCopy;
  documentKind: ReturnType<
    typeof selectSingleDocumentSessionShellView
  >['documentKind'];
  isDirty: boolean;
  lastSaveError: unknown | null;
  operationError: QuickWriteOperationError | null;
  operationPhase: QuickWriteOperationPhase | null;
  path: string | null;
  pendingSave: boolean;
}

const getQuickWriteStatusModel = ({
  copy,
  documentKind,
  isDirty,
  lastSaveError,
  operationError,
  operationPhase,
  path,
  pendingSave,
}: QuickWriteStatusInput) => {
  const filePath = documentKind === 'file' ? path : null;
  const baseTooltip = getQuickWriteBaseStatusTooltip(
    documentKind,
    filePath,
    copy,
  );

  if (lastSaveError) {
    return {
      activityLabel: `${copy.saveFailed}: ${getErrorMessage(lastSaveError, copy)}`,
      documentStatus:
        documentKind === 'closed'
          ? copy.documentStatus.closed
          : isDirty
            ? copy.documentStatus.dirty
            : getDocumentStatusLabel(documentKind, isDirty, copy),
      filePath,
      saveState: 'failed' as const,
      tooltip: `${baseTooltip}. ${getErrorMessage(lastSaveError, copy)}`,
    };
  }

  if (operationError) {
    const failureLabel = getOperationFailureLabel(operationError.phase, copy);
    return {
      activityLabel: `${failureLabel}: ${getErrorMessage(operationError.error, copy)}`,
      documentStatus: getDocumentStatusLabel(documentKind, isDirty, copy),
      filePath,
      saveState: getCurrentSaveState(isDirty, pendingSave),
      tooltip: `${baseTooltip}. ${failureLabel}: ${getErrorMessage(operationError.error, copy)}`,
    };
  }

  if (operationPhase) {
    const activityLabel = getOperationActivityLabel(operationPhase, copy);
    return {
      activityLabel,
      documentStatus: getDocumentStatusLabel(documentKind, isDirty, copy),
      filePath,
      saveState: 'saving' as const,
      tooltip: `${baseTooltip}. ${activityLabel}`,
    };
  }

  if (pendingSave) {
    return {
      activityLabel: copy.autosaving,
      documentStatus: getDocumentStatusLabel(documentKind, isDirty, copy),
      filePath,
      saveState: 'saving' as const,
      tooltip: `${baseTooltip}. ${copy.autosavePending}`,
    };
  }

  if (isDirty) {
    return {
      activityLabel: copy.unsavedEdits,
      documentStatus: copy.documentStatus.dirty,
      filePath,
      saveState: 'dirty' as const,
      tooltip: `${baseTooltip}. ${copy.unsavedEdits}`,
    };
  }

  return {
    activityLabel: documentKind === 'closed' ? copy.documentStatus.closed : '',
    documentStatus: getDocumentStatusLabel(documentKind, isDirty, copy),
    filePath,
    saveState: 'saved' as const,
    tooltip: baseTooltip,
  };
};

const getQuickWriteBaseStatusTooltip = (
  documentKind: QuickWriteStatusInput['documentKind'],
  filePath: string | null,
  copy: QuickWriteCopy,
): string => {
  if (filePath) {
    return `${copy.filePath}: ${filePath}`;
  }
  switch (documentKind) {
    case 'temporary':
      return copy.draftStatusTooltip;
    case 'closed':
      return copy.documentClosedTooltip;
    case 'empty':
      return copy.noDocumentTooltip;
    case 'file':
      return copy.filePathUnavailable;
  }
};

const getDocumentStatusLabel = (
  documentKind: QuickWriteStatusInput['documentKind'],
  isDirty: boolean,
  copy: QuickWriteCopy,
): string => {
  if (documentKind === 'closed') {
    return copy.documentStatus.closed;
  }
  if (documentKind === 'empty') {
    return copy.documentStatus.empty;
  }
  return isDirty ? copy.documentStatus.dirty : copy.documentStatus.open;
};

const getOperationActivityLabel = (
  operationPhase: QuickWriteOperationPhase,
  copy: QuickWriteCopy,
): string => {
  switch (operationPhase) {
    case 'startup':
      return copy.operationActivity.startup;
    case 'open':
      return copy.operationActivity.open;
    case 'saveTo':
      return copy.operationActivity.saveTo;
    case 'exportHtml':
      return copy.operationActivity.exportHtml;
    case 'printToPdf':
      return copy.operationActivity.printToPdf;
    case 'close':
      return copy.operationActivity.close;
    case 'newWindow':
      return copy.operationActivity.newWindow;
  }
};

const getOperationFailureLabel = (
  operationPhase: QuickWriteOperationPhase | null,
  copy: QuickWriteCopy,
): string => {
  switch (operationPhase) {
    case 'startup':
      return copy.operationFailure.startup;
    case 'open':
      return copy.operationFailure.open;
    case 'saveTo':
      return copy.operationFailure.saveTo;
    case 'exportHtml':
      return copy.operationFailure.exportHtml;
    case 'printToPdf':
      return copy.operationFailure.printToPdf;
    case 'close':
      return copy.operationFailure.close;
    case 'newWindow':
      return copy.operationFailure.newWindow;
    case null:
      return copy.operationFailed;
  }
};

const getCurrentSaveState = (
  isDirty: boolean,
  pendingSave: boolean,
): 'saved' | 'dirty' | 'saving' => {
  if (pendingSave) {
    return 'saving';
  }
  return isDirty ? 'dirty' : 'saved';
};

const getQuickWriteStatusBarDisplayStatus = (
  saveState: SaveStatus,
): 'saved' | 'dirty' | 'saving' | 'error' => {
  if (saveState === 'error') {
    return 'error';
  }
  return saveState;
};

const getQuickWriteStatusBarMessage = ({
  copy,
  documentKind,
  statusModel,
}: {
  copy: QuickWriteCopy;
  documentKind: QuickWriteStatusInput['documentKind'];
  statusModel: ReturnType<typeof getQuickWriteStatusModel>;
}): string => {
  if (statusModel.filePath) {
    return statusModel.filePath;
  }
  if (documentKind === 'file') {
    return copy.documentKind.file;
  }
  if (documentKind === 'closed') {
    return copy.documentKind.closed;
  }
  return copy.documentKind.draft;
};

const getQuickWriteStatusBarError = ({
  copy,
  operationError,
  saveError,
  statusMessage,
  statusModel,
}: {
  copy: QuickWriteCopy;
  operationError: QuickWriteOperationError | null;
  saveError: SaveErrorDetails | null;
  statusMessage: string | null;
  statusModel: ReturnType<typeof getQuickWriteStatusModel>;
}) => {
  if (saveError) {
    return saveError;
  }
  if (statusMessage) {
    return {
      reason: statusMessage,
      suggestion: copy.pleaseWait,
    };
  }
  if (statusModel.saveState !== 'failed') {
    return null;
  }
  return {
    reason: statusModel.activityLabel || copy.saveFailed,
    suggestion: operationError
      ? getOperationFailureLabel(operationError.phase, copy)
      : copy.pleaseWait,
  };
};

const createQuickWriteAutosaveInput = (
  state: SingleDocumentSessionShellState,
  draftId: string | null,
): QuickWriteAutosaveInput | null => {
  const { session } = state;
  if (session.saveTargetKind === 'file') {
    const path = session.sourcePath ?? session.documentPath;
    if (!path) {
      return null;
    }
    return {
      path,
      content: state.content,
      contentVersion: session.contentVersion,
      draftId: null,
      targetKind: 'file',
    };
  }

  if (session.saveTargetKind === 'recovery') {
    if (!session.recoveryPath || !draftId) {
      return null;
    }
    return {
      path: session.recoveryPath,
      content: state.content,
      contentVersion: session.contentVersion,
      draftId,
      targetKind: 'recovery',
    };
  }

  return null;
};

const getBaseName = (path: string): string => {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] || path;
};

const resolveQuickWriteLocale = (
  preference: SettingsLocalePreference,
): QuickWriteLocale => {
  if (preference === 'zh-CN' || preference === 'en-US') {
    return preference;
  }
  if (typeof navigator !== 'undefined') {
    return navigator.language.toLowerCase().startsWith('zh')
      ? 'zh-CN'
      : 'en-US';
  }
  return 'en-US';
};

const buildQuickWriteHtmlDocument = ({
  body,
  title,
}: {
  body: string;
  title: string;
}): string => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtmlText(title)}</title>
  <style>
    body {
      margin: 0;
      color: #111827;
      background: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.65;
    }
    main {
      box-sizing: border-box;
      width: min(760px, 100%);
      margin: 0 auto;
      padding: 48px 24px;
    }
    img, table {
      max-width: 100%;
    }
    table {
      border-collapse: collapse;
    }
    th, td {
      border: 1px solid #d1d5db;
      padding: 0.35rem 0.5rem;
    }
    pre {
      overflow-x: auto;
      padding: 1rem;
      background: #f3f4f6;
    }
    code {
      font-family: "SFMono-Regular", Consolas, monospace;
    }
  </style>
</head>
<body>
  <main>
${indentHtmlBody(body)}
  </main>
</body>
</html>
`;

const escapeHtmlText = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const indentHtmlBody = (body: string): string =>
  body
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');

const getFreshQuickWriteDraftOptions = (): {
  initialContent?: string;
} | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get('newDraft') !== '1') {
    return null;
  }

  const template = getQuickWriteTemplateById(params.get('template'));
  return template ? { initialContent: template.content } : {};
};
