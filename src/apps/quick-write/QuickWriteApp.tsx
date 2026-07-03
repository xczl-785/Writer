import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { FilePenLine } from 'lucide-react';
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
import { useSettingsStore } from '../../domains/settings/state/settingsStore';
import { QuickWriteMenuBar } from './QuickWriteMenuBar';
import { QuickWriteStatusBar } from './QuickWriteStatusBar';
import {
  quickWriteMenuSchema,
  type QuickWriteMenuCommand,
  type QuickWriteMenuGroup,
} from './quickWriteMenu';
import { useQuickWriteNativeMenuBridge } from './quickWriteNativeMenu';
import {
  createQuickWriteRuntimeAdapter,
  type QuickWriteOpenedFile,
  type QuickWriteRuntimeAdapter,
} from './quickWriteRuntime';
import { getQuickWriteTemplateById } from './quickWriteTemplates';
import type { SettingsLocalePreference } from '../../domains/settings/state/settingsStore';
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
  draftModeLabel: string;
  draftModeTooltip: string;
  draftStatusTooltip: string;
  filePath: string;
  filePathUnavailable: string;
  menu: {
    disabled: Partial<Record<QuickWriteMenuCommand, string>>;
    groups: Record<QuickWriteMenuGroup['id'], string>;
    items: Record<QuickWriteMenuCommand, string>;
  };
  noDocumentTooltip: string;
  operationActivity: Record<QuickWriteOperationPhase, string>;
  operationFailed: string;
  operationFailure: Record<QuickWriteOperationPhase | 'unknown', string>;
  pleaseWait: string;
  quickWriteBusy: string;
  recoveredDraftLabel: string;
  saveFailed: string;
  saved: string;
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
    draftModeLabel: 'Draft mode',
    draftModeTooltip:
      'Draft mode: autosaves to QuickWrite recovery until Save To creates a file',
    draftStatusTooltip: 'Draft mode: autosaving to QuickWrite recovery',
    filePath: 'File path',
    filePathUnavailable: 'File path unavailable',
    menu: {
      disabled: {
        'file.exit': 'Native QuickWrite app lifecycle is not available yet',
        'file.newWindow':
          'Native QuickWrite window runtime is not available yet',
      },
      groups: {
        edit: 'Edit',
        file: 'File',
        format: 'Format',
        paragraph: 'Paragraph',
      },
      items: {
        'edit.copy': 'Copy',
        'edit.cut': 'Cut',
        'edit.paste': 'Paste',
        'edit.find': 'Find',
        'edit.replace': 'Replace',
        'edit.selectAll': 'Select All',
        'edit.undo': 'Undo',
        'file.close': 'Close',
        'file.exportHtml': 'Export HTML...',
        'file.printToPdf': 'Print to PDF...',
        'file.exit': 'Exit',
        'file.newWindow': 'New Window',
        'file.open': 'Open File',
        'file.saveTo': 'Save To...',
        'format.bold': 'Bold',
        'format.italic': 'Italic',
        'format.link': 'Link',
        'paragraph.body': 'Body',
        'paragraph.bulletedList': 'Bulleted List',
        'paragraph.heading': 'Heading',
        'paragraph.numberedList': 'Numbered List',
        'paragraph.table': 'Table',
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
    recoveredDraftLabel: 'Recovered draft',
    saveFailed: 'Save failed',
    saved: 'Saved',
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
    draftModeLabel: '草稿模式',
    draftModeTooltip: '草稿模式：保存为文件前会自动保存到随手写恢复区',
    draftStatusTooltip: '草稿模式：正在自动保存到随手写恢复区',
    filePath: '文件路径',
    filePathUnavailable: '文件路径不可用',
    menu: {
      disabled: {
        'file.exit': '原生随手写应用生命周期尚不可用',
        'file.newWindow': '原生随手写窗口运行时尚不可用',
      },
      groups: {
        edit: '编辑',
        file: '文件',
        format: '格式',
        paragraph: '段落',
      },
      items: {
        'edit.copy': '复制',
        'edit.cut': '剪切',
        'edit.paste': '粘贴',
        'edit.find': '查找',
        'edit.replace': '替换',
        'edit.selectAll': '全选',
        'edit.undo': '撤销',
        'file.close': '关闭',
        'file.exportHtml': '导出 HTML...',
        'file.printToPdf': '打印为 PDF...',
        'file.exit': '退出',
        'file.newWindow': '新建窗口',
        'file.open': '打开文件',
        'file.saveTo': '另存为...',
        'format.bold': '加粗',
        'format.italic': '斜体',
        'format.link': '链接',
        'paragraph.body': '正文',
        'paragraph.bulletedList': '项目符号列表',
        'paragraph.heading': '标题',
        'paragraph.numberedList': '编号列表',
        'paragraph.table': '表格',
      },
    },
    noDocumentTooltip: '没有打开随手写文档',
    operationActivity: {
      close: '正在关闭文档...',
      exportHtml: '正在导出 HTML...',
      printToPdf: '正在打开系统 PDF 打印对话框...',
      newWindow: '正在打开新窗口...',
      open: '正在打开文件...',
      saveTo: '正在保存为文件...',
      startup: '正在启动随手写...',
    },
    operationFailed: '操作失败',
    operationFailure: {
      close: '关闭失败',
      exportHtml: 'HTML 导出失败',
      printToPdf: 'PDF 打印失败',
      newWindow: '新窗口打开失败',
      open: '打开失败',
      saveTo: '另存为失败',
      startup: '启动失败',
      unknown: '操作失败',
    },
    pleaseWait: '请稍候。',
    quickWriteBusy: '随手写正忙',
    recoveredDraftLabel: '已恢复草稿',
    saveFailed: '保存失败',
    saved: '已保存',
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
  const [state, dispatch] = useReducer(reduceQuickWriteShell, initialState);
  const themePreference = useSettingsStore((item) => item.themePreference);
  const editorFontSize = useSettingsStore((item) => item.editorFontSize);
  const localePreference = useSettingsStore((item) => item.localePreference);
  const locale = resolveQuickWriteLocale(localePreference);
  const copy = QUICK_WRITE_COPY[locale];
  const canOpenNewTemporaryDocumentWindow =
    quickWriteRuntime.canOpenNewTemporaryDocumentWindow();
  const localizedMenuGroups = useMemo(
    () =>
      localizeQuickWriteMenuGroups(copy, {
        canOpenNewTemporaryDocumentWindow,
      }),
    [canOpenNewTemporaryDocumentWindow, copy],
  );
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
  const view = selectSingleDocumentSessionShellView(state);
  stateRef.current = state;
  operationPhaseRef.current = operationPhase;
  const isBusy = operationPhase !== null;
  const isEditorDisabled =
    isBusy || view.documentKind === 'closed' || view.documentKind === 'empty';
  const isDraftMode = view.documentKind === 'temporary';
  const documentTitle = getQuickWriteDocumentTitle(view, copy);
  const documentSubtitle = getQuickWriteDocumentSubtitle(view, copy);
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

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    document.documentElement.lang = locale;
  }, [locale]);

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
      dispatchShell({ type: 'requestSave' });
    }, [dispatchShell]);

  const flushCurrentDocument = useCallback(async (): Promise<boolean> => {
    await synchronizeEditorMarkdownSnapshot();
    let current = stateRef.current;
    if (
      !current.pendingSave &&
      current.session.status === 'dirty' &&
      current.session.contentVersion !== current.session.savedVersion
    ) {
      dispatchShell({ type: 'requestSave' });
      current = stateRef.current;
    }

    if (!current.pendingSave) {
      return true;
    }

    while (current.pendingSave) {
      const pendingSave = current.pendingSave;
      const targetKind = current.pendingSaveTargetKind;
      try {
        await quickWriteRuntime.savePendingDocument({
          targetKind: targetKind === 'file' ? 'file' : 'recovery',
          path: pendingSave.target.path,
          draftId: targetKind === 'recovery' ? activeDraftIdRef.current : null,
          content: pendingSave.content,
          contentVersion: pendingSave.contentVersion,
          ...(targetKind === 'recovery'
            ? { editorState: editorRef.current?.getEditorStateSnapshot() }
            : {}),
        });
        dispatchShell({
          type: 'saveSettled',
          result: {
            ok: true,
            target: pendingSave.target,
            savedAt: Date.now(),
          },
        });
      } catch (error: unknown) {
        dispatchShell({
          type: 'saveSettled',
          result: {
            ok: false,
            target: pendingSave.target,
            error,
            failedAt: Date.now(),
          },
        });
        return false;
      }

      current = stateRef.current;
      if (
        !current.pendingSave &&
        current.session.status === 'dirty' &&
        current.session.contentVersion !== current.session.savedVersion
      ) {
        dispatchShell({ type: 'requestSave' });
        current = stateRef.current;
      }
    }

    return true;
  }, [dispatchShell, quickWriteRuntime, synchronizeEditorMarkdownSnapshot]);

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

      const current = stateRef.current;
      const draftId = activeDraftIdRef.current;
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
    } catch (error: unknown) {
      setOperationError({ phase: 'saveTo', error });
    } finally {
      endOperation('saveTo');
    }
  }, [beginOperation, dispatchShell, endOperation, quickWriteRuntime]);

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

  const handleClose = useCallback(async () => {
    if (!beginOperation('close')) {
      return;
    }
    setOperationError(null);
    try {
      if (!(await flushCurrentDocument())) {
        return;
      }

      activeDraftIdRef.current = null;
      restoredEditorStateRef.current = undefined;
      dispatchShell({ type: 'closeDocument' });
    } finally {
      endOperation('close');
    }
  }, [beginOperation, dispatchShell, endOperation, flushCurrentDocument]);

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
      dispatchShell({ type: 'requestSave' });
    },
    [dispatchShell, isEditorDisabled],
  );

  const handleEditorCommand = useCallback(
    (command: QuickWriteMenuCommand) => {
      const editor = editorRef.current;
      if (!editor || isEditorDisabled) {
        return;
      }

      editor.runCommand(command);
    },
    [isEditorDisabled],
  );

  const handleMenuCommand = useCallback(
    (command: QuickWriteMenuCommand) => {
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
          void handleClose();
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
      handleClose,
      handleEditorCommand,
      handleExportHtml,
      handlePrintToPdf,
      handleNewWindow,
      handleOpen,
      handleSaveTo,
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

  const disabledCommands = useMemo<
    Partial<Record<QuickWriteMenuCommand, string>>
  >(() => {
    const disabled: Partial<Record<QuickWriteMenuCommand, string>> = {};
    if (isBusy) {
      disabled['file.open'] = getOperationDisabledReason(operationPhase, copy);
      disabled['file.saveTo'] = getOperationDisabledReason(
        operationPhase,
        copy,
      );
      disabled['file.exportHtml'] = getOperationDisabledReason(
        operationPhase,
        copy,
      );
      disabled['file.printToPdf'] = getOperationDisabledReason(
        operationPhase,
        copy,
      );
      disabled['file.close'] = getOperationDisabledReason(operationPhase, copy);
      disabled['file.newWindow'] = getOperationDisabledReason(
        operationPhase,
        copy,
      );
    }
    if (!canOpenNewTemporaryDocumentWindow) {
      disabled['file.newWindow'] = copy.menu.disabled['file.newWindow'];
    }
    if (isEditorDisabled) {
      const reason = copy.disabledNoEditableDocument;
      disabled['file.exportHtml'] = reason;
      disabled['file.printToPdf'] = reason;
      disabled['edit.undo'] = reason;
      disabled['edit.cut'] = reason;
      disabled['edit.copy'] = reason;
      disabled['edit.paste'] = reason;
      disabled['edit.selectAll'] = reason;
      disabled['edit.find'] = reason;
      disabled['edit.replace'] = reason;
      disabled['format.bold'] = reason;
      disabled['format.italic'] = reason;
      disabled['format.link'] = reason;
      disabled['paragraph.body'] = reason;
      disabled['paragraph.heading'] = reason;
      disabled['paragraph.bulletedList'] = reason;
      disabled['paragraph.numberedList'] = reason;
      disabled['paragraph.table'] = reason;
    }
    if (view.documentKind === 'closed') {
      disabled['file.close'] = copy.disabledDocumentAlreadyClosed;
    }
    return disabled;
  }, [
    canOpenNewTemporaryDocumentWindow,
    copy,
    isBusy,
    isEditorDisabled,
    operationPhase,
    view.documentKind,
  ]);

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
        setOperationError({ phase: 'startup', error });
        operationPhaseRef.current = 'startup';
        setOperationPhase('startup');
      });

    return () => {
      isCancelled = true;
    };
  }, [dispatchShell, endOperation, quickWriteRuntime]);

  useEffect(() => {
    if (!state.pendingSave) {
      return;
    }

    const pendingSave = state.pendingSave;
    const targetKind = state.pendingSaveTargetKind;
    let isCancelled = false;

    void quickWriteRuntime
      .savePendingDocument({
        targetKind: targetKind === 'file' ? 'file' : 'recovery',
        path: pendingSave.target.path,
        draftId: targetKind === 'recovery' ? activeDraftIdRef.current : null,
        content: pendingSave.content,
        contentVersion: pendingSave.contentVersion,
        ...(targetKind === 'recovery'
          ? { editorState: editorRef.current?.getEditorStateSnapshot() }
          : {}),
      })
      .then(() => {
        if (isCancelled) {
          return;
        }
        dispatchShell({
          type: 'saveSettled',
          result: {
            ok: true,
            target: pendingSave.target,
            savedAt: Date.now(),
          },
        });
      })
      .catch((error: unknown) => {
        if (isCancelled) {
          return;
        }
        dispatchShell({
          type: 'saveSettled',
          result: {
            ok: false,
            target: pendingSave.target,
            error,
            failedAt: Date.now(),
          },
        });
      });

    return () => {
      isCancelled = true;
    };
  }, [
    dispatchShell,
    quickWriteRuntime,
    state.pendingSave,
    state.pendingSaveTargetKind,
  ]);

  useEffect(() => {
    if (
      !state.pendingSave &&
      !state.lastSaveError &&
      state.session.status === 'dirty' &&
      state.session.contentVersion !== state.session.savedVersion
    ) {
      dispatchShell({ type: 'requestSave' });
    }
  }, [
    dispatchShell,
    state.lastSaveError,
    state.pendingSave,
    state.session.contentVersion,
    state.session.savedVersion,
    state.session.status,
  ]);

  return (
    <main
      className="quick-write-shell"
      data-editor-font-size={editorFontSize}
      data-locale={localePreference}
      data-resolved-locale={locale}
      data-theme-preference={themePreference}
      lang={locale}
      style={shellStyle}
    >
      <header className="quick-write-topbar">
        <div className="quick-write-title-block">
          <div className="quick-write-title-row">
            {isDraftMode ? (
              <span title={copy.draftModeTooltip}>
                <FilePenLine
                  aria-label={copy.draftModeLabel}
                  className="quick-write-draft-icon"
                  role="img"
                  size={16}
                />
              </span>
            ) : null}
            <h1 title={documentTitle}>{documentTitle}</h1>
          </div>
          <span title={view.documentPath ?? documentSubtitle}>
            {documentSubtitle}
          </span>
        </div>
      </header>
      <QuickWriteMenuBar
        disabledCommands={disabledCommands}
        menuGroups={localizedMenuGroups}
        onCommand={handleMenuCommand}
      />
      {operationError ? (
        <output
          aria-label="QuickWrite operation error"
          className="quick-write-error"
        >
          {getErrorMessage(operationError.error, copy)}
        </output>
      ) : null}

      <QuickWriteEditor
        disabled={isEditorDisabled}
        path={view.documentPath}
        ref={editorRef}
        restoreState={restoredEditorStateRef.current}
        value={state.content}
        onMarkdownChange={updateEditorContent}
      />
      <QuickWriteStatusBar
        activityLabel={statusModel.activityLabel}
        documentStatus={statusModel.documentStatus}
        filePath={statusModel.filePath}
        labels={copy.statusAriaLabels}
        saveState={statusModel.saveState}
        tooltip={statusModel.tooltip}
      />
    </main>
  );
}

export default QuickWriteApp;

const getQuickWriteDocumentKindLabel = (
  documentKind: ReturnType<
    typeof selectSingleDocumentSessionShellView
  >['documentKind'],
  copy: QuickWriteCopy,
): string => {
  switch (documentKind) {
    case 'temporary':
      return copy.documentKind.draft;
    case 'file':
      return copy.documentKind.file;
    case 'closed':
      return copy.documentKind.closed;
    case 'empty':
      return copy.documentKind.draft;
  }
};

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

const getQuickWriteDocumentSubtitle = (
  view: ReturnType<typeof selectSingleDocumentSessionShellView>,
  copy: QuickWriteCopy,
): string => {
  if (view.documentKind === 'file' && view.documentPath) {
    return view.documentPath;
  }
  return (
    localizeQuickWriteDisplayLabel(view.displayLabel, copy) ??
    getQuickWriteDocumentKindLabel(view.documentKind, copy)
  );
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
    activityLabel:
      documentKind === 'closed' ? copy.documentStatus.closed : copy.saved,
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

const getOperationDisabledReason = (
  operationPhase: QuickWriteOperationPhase | null,
  copy: QuickWriteCopy,
): string =>
  operationPhase
    ? `${getOperationActivityLabel(operationPhase, copy)} ${copy.pleaseWait}`
    : copy.quickWriteBusy;

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

const localizeQuickWriteDisplayLabel = (
  displayLabel: string | null,
  copy: QuickWriteCopy,
): string | null => {
  if (!displayLabel) {
    return null;
  }
  return displayLabel === QUICK_WRITE_COPY['en-US'].recoveredDraftLabel
    ? copy.recoveredDraftLabel
    : displayLabel;
};

const localizeQuickWriteMenuGroups = (
  copy: QuickWriteCopy,
  options: { canOpenNewTemporaryDocumentWindow: boolean },
): QuickWriteMenuGroup[] =>
  quickWriteMenuSchema.map((group) => ({
    ...group,
    label: copy.menu.groups[group.id],
    items: group.items.map((item) => ({
      ...item,
      disabledReason:
        item.command === 'file.newWindow' &&
        options.canOpenNewTemporaryDocumentWindow
          ? undefined
          : (copy.menu.disabled[item.command] ?? item.disabledReason),
      label: copy.menu.items[item.command],
    })),
  }));

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
