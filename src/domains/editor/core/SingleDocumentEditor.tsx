import {
  forwardRef,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { AnyExtension } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import { type Editor as TiptapEditor } from '@tiptap/react';
import { t } from '../../../shared/i18n';
import {
  DEFAULT_TABLE_INSERT,
  FIND_MATCH_LIMIT,
  type ToolbarCommandId,
} from './constants';
import { FindReplacePanel } from '../ui/components/FindReplacePanel';
import {
  type ToolbarShortcutRuntime,
  createFindReplaceShortcutExtension,
  createToolbarShortcutExtension,
  type FindReplaceShortcutRuntime,
} from '../extensions';
import { useTransientStatus } from '../hooks/useTransientStatus';
import { useFindReplace } from '../hooks/useFindReplace';
import { useToolbarCommands } from '../hooks/useToolbarCommands';
import {
  ContextMenu,
  useContextMenu,
} from '../../../ui/components/ContextMenu';
import { Outline } from '../../../ui/components/Outline';
import {
  useSlashMenu,
  SlashMenuView,
  SlashInlineView,
  useBubbleMenu,
  BubbleMenu,
  useLinkTooltip,
  LinkTooltip,
  GhostHint,
} from '../ui/menus';
import type { SlashImageAction } from '../ui/menus/useSlashMenu';
import {
  useSafeCoords,
  useGhostHint,
  useUndoRedo,
  useTypewriterAnchor,
} from '../hooks';
import { getMountedEditorView } from '../hooks/editorViewAccess';
import { createEditorLayoutModel } from './EditorLayoutModel';
import { EditorView } from '../view/EditorView';
import { attachEditorMenuBridge } from '../integration/menuBridge';
import { openEditorContextMenu as openEditorContextMenuBridge } from '../integration/contextBridge';
import { hasActiveOverlayInDom } from '../domain';
import { useSingleDocumentEditorController } from './useSingleDocumentEditorController';
import { MarkdownService } from '../../../services/markdown/MarkdownService';
import '../../../ui/components/BlockBoundary/blockBoundary.css';
import './Editor.css';

export type SingleDocumentEditorCommand =
  | 'edit.undo'
  | 'edit.redo'
  | 'edit.cut'
  | 'edit.copy'
  | 'edit.copy_markdown'
  | 'edit.copy_plain'
  | 'edit.paste'
  | 'edit.paste_plain'
  | 'edit.select_all'
  | 'edit.find'
  | 'edit.replace'
  | 'format.bold'
  | 'format.italic'
  | 'format.inline_code'
  | 'format.strike'
  | 'format.underline'
  | 'format.highlight'
  | 'format.link'
  | 'format.image'
  | 'paragraph.body'
  | 'paragraph.heading_1'
  | 'paragraph.heading_2'
  | 'paragraph.heading_3'
  | 'paragraph.heading_4'
  | 'paragraph.heading_5'
  | 'paragraph.heading_6'
  | 'paragraph.blockquote'
  | 'paragraph.code_block'
  | 'paragraph.unordered_list'
  | 'paragraph.ordered_list'
  | 'paragraph.task_list'
  | 'paragraph.horizontal_rule'
  | 'paragraph.table'
  | 'view.outline';

export type SingleDocumentEditorStateSnapshot = {
  selection?: {
    anchor: number;
    head: number;
    updatedAt: number;
  };
  scrollTop?: number;
};

export type SingleDocumentEditorHandle = {
  insertDefaultTable: () => void;
  runCommand: (command: SingleDocumentEditorCommand) => void;
  getMarkdownSnapshot: () => Promise<string | undefined>;
  getHtmlSnapshot: () => string | undefined;
  getEditorStateSnapshot: () => SingleDocumentEditorStateSnapshot | undefined;
  restoreEditorStateSnapshot: (
    editorState: SingleDocumentEditorStateSnapshot | undefined,
  ) => void;
};

export type SingleDocumentEditorTestApi = {
  setMarkdown: (markdown: string) => Promise<void>;
  loadMarkdownWithoutChange: (markdown: string) => Promise<void>;
  getMarkdown: () => Promise<string | undefined>;
};

type EditorAwarePasteHandler = (
  event: ClipboardEvent,
  targetEditor: TiptapEditor | null,
) => boolean | Promise<boolean>;

export type SingleDocumentEditorProps = {
  documentId: string | null;
  loadKey: string | null;
  content: string;
  disabled?: boolean;
  readOnly?: boolean;
  isTypewriterActive?: boolean;
  viewportTier?: 'min' | 'default' | 'airy';
  isFocusZen?: boolean;
  isHeaderAwake?: boolean;
  onSetFocusZen?: (enabled: boolean) => void;
  onMarkdownChange: (content: string) => void | Promise<void>;
  onSaveShortcut?: () => void;
  onLoadStateChange?: (isLoading: boolean) => void;
  onStatus?: (status: 'idle' | 'error', message: string) => void;
  onError?: (error: unknown, context: string) => void;
  handlePaste?: EditorAwarePasteHandler;
  imageAction?: SlashImageAction;
  breadcrumb: ReactNode;
  outlineRefreshToken?: string | null;
  className?: string;
};

type EditorShortcutRuntime = ToolbarShortcutRuntime &
  FindReplaceShortcutRuntime & {
    setEditor: (editor: TiptapEditor | null) => void;
    setToolbarCommandRunner: (
      runner: (id: ToolbarCommandId) => boolean,
    ) => void;
  };

function createEditorShortcutRuntime(): EditorShortcutRuntime {
  let editor: TiptapEditor | null = null;
  let toolbarCommandRunner: (id: ToolbarCommandId) => boolean = () => false;

  return {
    getEditor: () => editor,
    runToolbarCommand: (id) => toolbarCommandRunner(id),
    setEditor: (nextEditor) => {
      editor = nextEditor;
    },
    setToolbarCommandRunner: (runner) => {
      toolbarCommandRunner = runner;
    },
  };
}

const dispatchEditorCommand = (id: SingleDocumentEditorCommand) => {
  window.dispatchEvent(
    new CustomEvent('writer:editor-command', { detail: { id } }),
  );
};

const noopStatus = () => undefined;
const RESTORE_VIEW_RETRY_LIMIT = 20;

export const SingleDocumentEditor = forwardRef<
  SingleDocumentEditorHandle,
  SingleDocumentEditorProps
>(function SingleDocumentEditor(
  {
    documentId,
    loadKey,
    content,
    disabled = false,
    readOnly = false,
    isTypewriterActive = false,
    viewportTier = 'default',
    isFocusZen = false,
    isHeaderAwake = true,
    onSetFocusZen,
    onMarkdownChange,
    onSaveShortcut,
    onLoadStateChange,
    onStatus = noopStatus,
    onError,
    handlePaste,
    imageAction,
    breadcrumb,
    outlineRefreshToken,
    className,
  },
  ref,
) {
  const contextMenu = useContextMenu();
  const editorRef = useRef<TiptapEditor | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const shortcutRuntime = useMemo(() => createEditorShortcutRuntime(), []);
  const [currentEditor, setCurrentEditor] = useState<TiptapEditor | null>(null);
  const [hasEditorWidgetFocus, setHasEditorWidgetFocus] = useState(false);
  const [editorRevision, forceEditorRevision] = useState(0);
  const [isOutlineOpen, setIsOutlineOpen] = useState(false);
  const [lastRestoredSelection, setLastRestoredSelection] = useState<
    string | null
  >(null);
  const [lastRestoredScrollTop, setLastRestoredScrollTop] = useState<
    number | null
  >(null);
  const pendingRestoreRef = useRef<SingleDocumentEditorStateSnapshot | null>(
    null,
  );
  const pendingRestoreAttemptsRef = useRef(0);
  const [restoreRetryToken, setRestoreRetryToken] = useState(0);

  const { getSafeCoordsAtPos } = useSafeCoords();
  const { setTransientStatus, setDestructiveStatus } = useTransientStatus();
  const { undo, redo } = useUndoRedo(setTransientStatus);

  const {
    session: slashSession,
    commands: slashCommands,
    selectedIndex: slashSelectedIndex,
    executeCommand,
    hoverIndex,
  } = useSlashMenu({
    editor: currentEditor,
    defaultTableInsert: DEFAULT_TABLE_INSERT,
    imageAction,
    getSafeCoordsAtPos,
  });

  const ghostHintPosition = useGhostHint(
    currentEditor,
    slashSession.phase,
    getSafeCoordsAtPos,
  );
  const bubbleMenuPosition = useBubbleMenu(currentEditor);
  const linkTooltipState = useLinkTooltip(currentEditor);
  const findReplace = useFindReplace({
    editor: currentEditor,
    editorRevision,
    setTransientStatus,
  });
  const hasTransientOverlay =
    slashSession.phase !== 'idle' ||
    findReplace.isFindPanelOpen ||
    contextMenu.state.isOpen ||
    isOutlineOpen;
  const { runToolbarCommand } = useToolbarCommands({
    hasEditorWidgetFocus,
    setTransientStatus,
    setDestructiveStatus,
  });

  const toolbarShortcutRuntime: ToolbarShortcutRuntime = shortcutRuntime;
  const findReplaceShortcutRuntime: FindReplaceShortcutRuntime =
    shortcutRuntime;

  const toolbarShortcutExtension = useMemo(
    () => createToolbarShortcutExtension(toolbarShortcutRuntime),
    [toolbarShortcutRuntime],
  );
  const findReplaceShortcutExtension = useMemo(
    () =>
      createFindReplaceShortcutExtension({
        openFindPanel: findReplace.openFindPanel,
        undo,
        redo,
        runtime: findReplaceShortcutRuntime,
      }),
    [findReplace.openFindPanel, findReplaceShortcutRuntime, redo, undo],
  );

  const instanceExtensions: AnyExtension[] = useMemo(
    () => [toolbarShortcutExtension, findReplaceShortcutExtension],
    [findReplaceShortcutExtension, toolbarShortcutExtension],
  );

  const onEditorRevisionChange = useCallback(
    () => forceEditorRevision((t) => t + 1),
    [],
  );

  const { editor, serializeMarkdown } = useSingleDocumentEditorController({
    documentId,
    loadKey,
    content,
    disabled,
    readOnly,
    editorRef,
    extensions: instanceExtensions,
    handlePaste,
    onMarkdownChange,
    onSaveShortcut,
    onLoadStateChange,
    onStatus,
    onError,
    onEditorRevisionChange,
  });

  useEffect(() => {
    shortcutRuntime.setEditor(editor);
    setCurrentEditor(editor);
  }, [editor, shortcutRuntime]);

  const layoutModel = useMemo(
    () => createEditorLayoutModel(viewportTier),
    [viewportTier],
  );

  useTypewriterAnchor({
    editor,
    enabled: isTypewriterActive,
    anchorRatio: layoutModel.typewriterAnchorRatio,
  });

  useEffect(() => {
    if (!isFocusZen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (hasTransientOverlay || hasActiveOverlayInDom(event.target)) return;
      event.preventDefault();
      onSetFocusZen?.(false);
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [hasTransientOverlay, isFocusZen, onSetFocusZen]);

  useEffect(() => {
    shortcutRuntime.setToolbarCommandRunner(
      editor ? (id) => runToolbarCommand(editor, id) : () => false,
    );
  }, [editor, runToolbarCommand, shortcutRuntime]);

  useEffect(() => {
    if (!editor) return;
    const view = getMountedEditorView(editor);
    if (!view) return;
    const dom = view.dom;
    const add = () => dom.classList.add('link-mod-active');
    const remove = () => dom.classList.remove('link-mod-active');
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') add();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') remove();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', remove);
    return () => {
      remove();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', remove);
    };
  }, [editor]);

  useEffect(() => {
    setIsOutlineOpen(false);
  }, [loadKey]);

  const copyText = useCallback(
    async (text: string, successMessage: string): Promise<void> => {
      try {
        await navigator.clipboard.writeText(text);
        onStatus('idle', successMessage);
      } catch {
        onStatus('error', t('status.menu.clipboardDenied'));
      }
    },
    [onStatus],
  );

  useEffect(() => {
    if (!editor) return;
    return attachEditorMenuBridge({
      editor,
      findReplace,
      setStatus: onStatus,
      setOutlineOpen: setIsOutlineOpen,
      imageAction,
    });
  }, [editor, findReplace, imageAction, onStatus]);

  const openEditorContextMenu = useCallback(
    (event: ReactMouseEvent) => {
      if (!editor || disabled || readOnly) return;
      openEditorContextMenuBridge({
        event,
        editor,
        contextMenu,
        copyText,
        setStatus: onStatus,
      });
    },
    [copyText, contextMenu, disabled, editor, onStatus, readOnly],
  );

  const getScrollContainer = useCallback((): HTMLElement | null => {
    return (
      rootRef.current?.querySelector<HTMLElement>('.editor-content-area') ??
      null
    );
  }, []);

  const requestPendingRestoreRetry = useCallback(() => {
    if (pendingRestoreAttemptsRef.current >= RESTORE_VIEW_RETRY_LIMIT) return;
    pendingRestoreAttemptsRef.current += 1;
    window.requestAnimationFrame(() => {
      setRestoreRetryToken((token) => token + 1);
    });
  }, []);

  const applyEditorStateSnapshot = useCallback(
    (editorState: SingleDocumentEditorStateSnapshot | undefined) => {
      if (!editor || !editorState) return false;
      const view = getMountedEditorView(editor);
      if (!view) return false;

      const selection = editorState.selection;
      if (selection) {
        const docSize = editor.state.doc.content.size;
        const anchor = Math.max(0, Math.min(selection.anchor, docSize));
        const head = Math.max(0, Math.min(selection.head, docSize));
        const tr = editor.state.tr.setSelection(
          TextSelection.create(editor.state.doc, anchor, head),
        );
        view.dispatch(tr);
        setLastRestoredSelection(`${anchor}:${head}`);
      }
      if (typeof editorState.scrollTop === 'number') {
        const scrollTop = editorState.scrollTop;
        window.requestAnimationFrame(() => {
          const scrollContainer = getScrollContainer();
          if (scrollContainer) {
            scrollContainer.scrollTop = scrollTop;
          }
          setLastRestoredScrollTop(scrollTop);
        });
      }
      return true;
    },
    [editor, getScrollContainer],
  );

  const restoreEditorStateSnapshot = useCallback(
    (editorState: SingleDocumentEditorStateSnapshot | undefined) => {
      if (!editorState) return;
      if (applyEditorStateSnapshot(editorState)) {
        pendingRestoreRef.current = null;
        pendingRestoreAttemptsRef.current = 0;
        return;
      }
      pendingRestoreRef.current = editorState;
      requestPendingRestoreRetry();
    },
    [applyEditorStateSnapshot, requestPendingRestoreRetry],
  );

  useEffect(() => {
    const pendingRestore = pendingRestoreRef.current;
    if (!pendingRestore) return;
    if (applyEditorStateSnapshot(pendingRestore)) {
      pendingRestoreRef.current = null;
      pendingRestoreAttemptsRef.current = 0;
      return;
    }
    requestPendingRestoreRetry();
  }, [applyEditorStateSnapshot, requestPendingRestoreRetry, restoreRetryToken]);

  useImperativeHandle(
    ref,
    () => ({
      insertDefaultTable: () => {
        if (!editor || disabled || readOnly) return;
        editor.chain().focus().insertTable(DEFAULT_TABLE_INSERT).run();
      },
      runCommand: (command) => {
        if (!editor || disabled || readOnly) return;
        dispatchEditorCommand(command);
      },
      getMarkdownSnapshot: () => serializeMarkdown(),
      getHtmlSnapshot: () => editor?.getHTML(),
      getEditorStateSnapshot: () => {
        if (!editor) return undefined;
        const { selection } = editor.state;
        return {
          selection: {
            anchor: selection.anchor,
            head: selection.head,
            updatedAt: Date.now(),
          },
          scrollTop: getScrollContainer()?.scrollTop ?? 0,
        };
      },
      restoreEditorStateSnapshot,
    }),
    [
      disabled,
      editor,
      getScrollContainer,
      readOnly,
      restoreEditorStateSnapshot,
      serializeMarkdown,
    ],
  );

  useEffect(() => {
    if (import.meta.env.MODE !== 'test') return;
    const root = rootRef.current as
      | (HTMLDivElement & {
          __singleDocumentEditorTestApi?: SingleDocumentEditorTestApi;
        })
      | null;
    if (!root || !editor) return;

    const testApi: SingleDocumentEditorTestApi = {
      async loadMarkdownWithoutChange(markdown) {
        if (disabled || readOnly) return;
        let json;
        try {
          json = await MarkdownService.parse(markdown);
        } catch {
          json = {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: markdown
                  ? [{ type: 'text' as const, text: markdown }]
                  : undefined,
              },
            ],
          };
        }
        editor.commands.loadDocument(json);
        editor.commands.focus('end');
      },
      async setMarkdown(markdown) {
        await testApi.loadMarkdownWithoutChange(markdown);
        const serialized = await serializeMarkdown();
        if (serialized !== undefined) {
          await onMarkdownChange(serialized);
        }
      },
      getMarkdown: serializeMarkdown,
    };

    Object.defineProperty(root, '__singleDocumentEditorTestApi', {
      configurable: true,
      value: testApi,
    });

    return () => {
      delete root.__singleDocumentEditorTestApi;
    };
  }, [disabled, editor, onMarkdownChange, readOnly, serializeMarkdown]);

  if (!editor) return null;

  const editorLayoutStyle: CSSProperties = {
    ['--editor-content-max-width' as string]: `${layoutModel.maxContentWidth}px`,
    ['--editor-content-padding-top' as string]: `${layoutModel.contentPaddingTop}px`,
    ['--editor-content-padding-inline' as string]: `${layoutModel.contentPaddingInline}px`,
    ['--editor-content-padding-bottom' as string]:
      layoutModel.contentPaddingBottom,
  };

  return (
    <>
      <div
        ref={rootRef}
        className={`relative h-full w-full ${
          isTypewriterActive ? 'is-typewriter-active' : ''
        } viewport-tier-${viewportTier} ${className ?? ''}`}
        data-disabled={disabled ? 'true' : undefined}
        data-document-id={documentId ?? undefined}
        data-markdown={content}
        data-restored-scroll-top={lastRestoredScrollTop ?? undefined}
        data-restored-selection={lastRestoredSelection ?? undefined}
        style={editorLayoutStyle}
      >
        <EditorView
          editor={editor}
          setHasEditorWidgetFocus={setHasEditorWidgetFocus}
          onEditorContextMenu={openEditorContextMenu}
          isOutlineOpen={isOutlineOpen}
          onToggleOutline={() => setIsOutlineOpen((prev) => !prev)}
          onCloseOutline={() => setIsOutlineOpen(false)}
          breadcrumb={breadcrumb}
          outlinePopover={
            <Outline
              editor={editor}
              isOpen={isOutlineOpen}
              refreshToken={outlineRefreshToken ?? loadKey}
              onClose={() => setIsOutlineOpen(false)}
            />
          }
          findReplacePanel={
            <FindReplacePanel
              isOpen={findReplace.isFindPanelOpen}
              isReplaceMode={findReplace.isReplaceMode}
              findQuery={findReplace.findQuery}
              replaceQuery={findReplace.replaceQuery}
              findMatchesCount={findReplace.findMatches.length}
              findCountText={findReplace.findCountText}
              findProgressText={findReplace.findProgressText}
              findInputRef={findReplace.findInputRef}
              replaceInputRef={findReplace.replaceInputRef}
              onClose={findReplace.closeFindPanel}
              onFindQueryChange={findReplace.setFindQuery}
              onReplaceQueryChange={findReplace.setReplaceQuery}
              onPrev={findReplace.goToPrevFindMatch}
              onNext={findReplace.goToNextFindMatch}
              onReplaceOne={findReplace.replaceOneActiveMatch}
              onReplaceAll={findReplace.replaceAllActiveMatches}
            />
          }
          bubbleMenu={
            <BubbleMenu
              position={bubbleMenuPosition}
              editor={editor}
              onShowStatus={(msg) => onStatus('idle', msg)}
            />
          }
          ghostHint={<GhostHint position={ghostHintPosition} />}
          linkTooltip={<LinkTooltip state={linkTooltipState} />}
          slashMenu={
            <SlashMenuView
              isOpen={slashSession.phase !== 'idle'}
              anchorRect={slashSession.anchorRect}
              commands={slashCommands}
              selectedIndex={slashSelectedIndex}
              onSelect={executeCommand}
              onHover={hoverIndex}
            />
          }
          isFocusZen={isFocusZen}
          isHeaderAwake={isHeaderAwake}
        />
        <SlashInlineView
          isOpen={slashSession.phase !== 'idle'}
          anchorRect={slashSession.anchorRect}
          query={slashSession.query}
        />
      </div>
      <ContextMenu
        isOpen={contextMenu.state.isOpen}
        x={contextMenu.state.x}
        y={contextMenu.state.y}
        items={contextMenu.state.items}
        onClose={contextMenu.close}
      />
    </>
  );
});

export const SINGLE_DOCUMENT_EDITOR_SOURCE_MARKERS = [
  'documentId',
  'loadKey',
  'onMarkdownChange',
  'onSaveShortcut',
  'useSingleDocumentEditorController',
  'EditorView',
  'EditorShell',
  'attachEditorMenuBridge',
  String(FIND_MATCH_LIMIT),
] as const;
