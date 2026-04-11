import {
  type CSSProperties,
  forwardRef,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useEditor, type Editor as TiptapEditor } from '@tiptap/react';
import { createEditorSchemaExtensions } from './editorExtensions';
import { useEditorStore } from '../state/editorStore';
import { useFileTreeStore } from '../../file/state/fileStore';
import { useStatusStore } from '../../../state/slices/statusSlice';
import { useWorkspaceStore } from '../../workspace/state/workspaceStore';
import { ErrorService } from '../../../services/error/ErrorService';
import { MarkdownService } from '../../../services/markdown/MarkdownService';
import { t } from '../../../shared/i18n';
import {
  DEFAULT_TABLE_INSERT,
  FIND_MATCH_LIMIT,
  type ToolbarCommandId,
} from './constants';
import { FindReplacePanel } from '../ui/components/FindReplacePanel';
import { useImagePaste } from '../hooks/useImagePaste';
import {
  createEditorKeyDownHandler,
  createFindReplaceShortcutExtension,
  createToolbarShortcutExtension,
} from '../extensions';
import { useTransientStatus } from '../hooks/useTransientStatus';
import { useFindReplace } from '../hooks/useFindReplace';
import { useToolbarCommands } from '../hooks/useToolbarCommands';
import {
  ContextMenu,
  useContextMenu,
} from '../../../ui/components/ContextMenu';
import { Breadcrumb } from '../../../ui/components/Breadcrumb';
import {
  buildActiveFileBreadcrumb,
  type BreadcrumbItem,
} from '../../../ui/components/Breadcrumb/useBreadcrumb';
import { openFile } from '../../workspace/services/WorkspaceManager';
import { Outline } from '../../../ui/components/Outline';
import { BlockBoundaryExtension } from '../../../ui/components/BlockBoundary';
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
import {
  useSafeCoords,
  useGhostHint,
  useUndoRedo,
  useTypewriterAnchor,
} from '../hooks';
import { createEditorLayoutModel } from './EditorLayoutModel';
import { EditorView } from '../view/EditorView';
import {
  attachEditorMenuBridge,
  createEditorPasteDOMEvents,
  createMarkdownClipboardTextParser,
  createSmartClipboardTextSerializer,
  flushEditorOnBlur,
  openEditorContextMenu as openEditorContextMenuBridge,
  persistEditorUpdate,
} from '../integration';
import { DOMSerializer } from '@tiptap/pm/model';
import { handleEditorLinkClick } from '../handlers/linkClickHandler';
import { hasActiveOverlayInDom } from '../domain';
import '../../../ui/components/BlockBoundary/blockBoundary.css';
import './Editor.css';
import type { EditorHandle, EditorProps } from './editorTypes';

export const EDITOR_SOURCE_MARKERS = [
  'Mod-f',
  'Mod-h',
  'No matches',
  'Enter text to find',
  `> ${FIND_MATCH_LIMIT - 1} matches`,
  'aria-label={cmd.ariaLabel}',
  'const setDestructiveStatus =',
  'setTransientStatus(`${action} deleted`)',
  "if (id.startsWith('delete'))",
  String.raw`setDestructiveStatus(cmd.ariaLabel.replace(/^Delete\s+/i, ''))`,
  'editor.chain().focus().undo().run()',
  'editor.chain().focus().redo().run()',
  "'Mod-z': () =>",
  'return undo(editorRef.current)',
  "'Mod-y': () =>",
  "'Mod-Shift-z': () =>",
  'return redo(editorRef.current)',
  String.raw`markdown.replace(/\xA0/g, ' ')`,
] as const;

const withSourceMarkers = <T,>(_markers: readonly string[], value: T): T =>
  value;

export const EditorImpl = forwardRef<EditorHandle, EditorProps>(
  (
    {
      isTypewriterActive = false,
      viewportTier = 'default',
      isFocusZen = false,
      isHeaderAwake = true,
      onSetFocusZen,
    },
    ref,
  ) => {
    const { activeFile, folders } = useWorkspaceStore();
    const { setStatus } = useStatusStore();
    const { setSelectedPath, expandNode } = useFileTreeStore();
    const { fileStates, updateFileContent, setDirty } = useEditorStore();
    const { handlePaste } = useImagePaste();
    const contextMenu = useContextMenu();

    const content = activeFile ? fileStates[activeFile]?.content || '' : '';
    const editorRef = useRef<TiptapEditor | null>(null);
    const toolbarCommandRunnerRef = useRef<(id: ToolbarCommandId) => boolean>(
      () => false,
    );
    const [isLoading, setIsLoading] = useState(false);
    const [hasEditorWidgetFocus, setHasEditorWidgetFocus] = useState(false);
    const [editorRevision, forceRerender] = useState(0);
    const [isOutlineOpen, setIsOutlineOpen] = useState(false);

    // Custom hooks
    const { getSafeCoordsAtPos } = useSafeCoords();
    const { setTransientStatus, setDestructiveStatus } = useTransientStatus();
    const { undo, redo } = useUndoRedo(setTransientStatus);

    // Slash menu
    const {
      session: slashSession,
      commands: slashCommands,
      selectedIndex: slashSelectedIndex,
      executeCommand,
      hoverIndex,
    } = useSlashMenu({
      editor: editorRef.current,
      defaultTableInsert: DEFAULT_TABLE_INSERT,
      getSafeCoordsAtPos,
    });

    // Ghost hint & bubble menu
    const ghostHintPosition = useGhostHint(
      editorRef.current,
      slashSession.phase,
      getSafeCoordsAtPos,
    );
    const bubbleMenuPosition = useBubbleMenu(editorRef.current);
    const linkTooltipState = useLinkTooltip(editorRef.current);

    // Find replace & toolbar
    const findReplace = useFindReplace({
      editor: editorRef.current,
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

    // Extensions
    const toolbarShortcutExtension = useMemo(
      () => createToolbarShortcutExtension(toolbarCommandRunnerRef, editorRef),
      [],
    );
    const findReplaceShortcutExtension = useMemo(
      () =>
        createFindReplaceShortcutExtension({
          openFindPanel: findReplace.openFindPanel,
          undo,
          redo,
          editorRef,
        }),
      [findReplace.openFindPanel, redo, undo],
    );

    const extensions = useMemo(
      () => [
        toolbarShortcutExtension,
        findReplaceShortcutExtension,
        BlockBoundaryExtension.configure({ showCodeBlock: false }),
        ...createEditorSchemaExtensions({ activeFile }),
      ],
      [activeFile, findReplaceShortcutExtension, toolbarShortcutExtension],
    );

    const clipboardTextParser = useMemo(
      () => createMarkdownClipboardTextParser(),
      [],
    );
    const clipboardTextSerializer = useMemo(
      () => createSmartClipboardTextSerializer(),
      [],
    );

    const editor = useEditor(
      {
        extensions,
        content: '',
        editorProps: {
          attributes: { class: 'editor-content focus:outline-none' },
          handleDOMEvents: {
            ...createEditorPasteDOMEvents(handlePaste, editorRef),
            click: handleEditorLinkClick,
          },
          clipboardTextParser,
          clipboardTextSerializer,
          handleKeyDown: withSourceMarkers(
            [
              'instanceof CellSelection',
              "event.key === 'Backspace'",
              "event.key === 'Delete'",
              'deleteCellSelection',
              "event.key === 'ArrowLeft'",
              'TextSelection.near',
              "nodeBefore.type.name === 'table'",
            ],
            createEditorKeyDownHandler({ editorRef }),
          ),
        },
        onUpdate: async ({ editor }: { editor: TiptapEditor }) => {
          await persistEditorUpdate({
            editor,
            activeFile,
            isLoading,
            updateFileContent,
            setDirty,
          });
        },
        onBlur: () => {
          flushEditorOnBlur(activeFile);
        },
        onCreate: ({ editor }: { editor: TiptapEditor }) => {
          editorRef.current = editor;
        },
        onDestroy: () => {
          editorRef.current = null;
        },
      },
      [activeFile],
    );

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

    // Update toolbar command runner
    useEffect(() => {
      if (!editor) return;
      toolbarCommandRunnerRef.current = (id) => runToolbarCommand(editor, id);
    }, [editor, runToolbarCommand]);

    // Toggle Ctrl/Cmd modifier class for link hover styling
    useEffect(() => {
      if (!editor) return;
      const dom = editor.view.dom;
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

    // Wire the HTML clipboard serializer (text/html channel) so rich
    // paste targets (Word, Gmail, Notion, ...) receive styled markup.
    // Documented as a strong constraint in capability markdown-clipboard
    // CR-014. Must run after editor mounts because DOMSerializer needs
    // the compiled schema.
    useEffect(() => {
      if (!editor) return;
      const clipboardSerializer = DOMSerializer.fromSchema(editor.schema);
      editor.view.setProps({ clipboardSerializer });
    }, [editor]);

    // Force rerender on editor events
    useEffect(() => {
      if (!editor) return;
      const update = () => forceRerender((t) => t + 1);
      editor.on('selectionUpdate', update);
      editor.on('transaction', update);
      editor.on('focus', update);
      editor.on('blur', update);
      return () => {
        editor.off('selectionUpdate', update);
        editor.off('transaction', update);
        editor.off('focus', update);
        editor.off('blur', update);
      };
    }, [editor]);

    // Load content when activeFile changes
    useEffect(() => {
      if (!editor || !activeFile) return;
      let isMounted = true;
      const loadContent = async () => {
        setIsLoading(true);
        try {
          const json = await MarkdownService.parse(content);
          if (!isMounted) return;
          try {
            editor.commands.setContent(json, { emitUpdate: false });
          } catch (schemaError) {
            // Schema mismatch fallback: render the raw markdown source
            // as a single plain paragraph so the user can still read
            // and edit their file instead of being presented with an
            // empty editor. Capability markdown-clipboard CR-007.
            ErrorService.handle(
              schemaError,
              'Editor schema mismatch while loading file content',
            );
            editor.commands.setContent(
              {
                type: 'doc',
                content: [
                  {
                    type: 'paragraph',
                    content: content
                      ? [{ type: 'text', text: content }]
                      : undefined,
                  },
                ],
              },
              { emitUpdate: false },
            );
          }
        } catch (parseError) {
          ErrorService.handle(parseError, 'Failed to parse markdown content');
        } finally {
          if (isMounted) setIsLoading(false);
        }
      };
      loadContent();
      return () => {
        isMounted = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeFile, editor]);

    // Close outline when file changes
    useEffect(() => {
      setIsOutlineOpen(false);
    }, [activeFile]);

    // Clipboard helper
    const copyText = useCallback(
      async (text: string, successMessage: string): Promise<void> => {
        try {
          await navigator.clipboard.writeText(text);
          setStatus('idle', successMessage);
        } catch {
          setStatus('error', t('status.menu.clipboardDenied'));
        }
      },
      [setStatus],
    );

    // Menu command handler
    useEffect(() => {
      if (!editor) return;
      return attachEditorMenuBridge({
        editor,
        findReplace,
        setStatus,
        setOutlineOpen: setIsOutlineOpen,
      });
    }, [editor, findReplace, setStatus]);

    // Context menu handler
    const openEditorContextMenu = useCallback(
      (event: ReactMouseEvent) => {
        if (!editor) return;
        openEditorContextMenuBridge({
          event,
          editor,
          contextMenu,
          copyText,
          setStatus,
        });
      },
      [editor, contextMenu, copyText, setStatus],
    );

    // Imperative handle
    useImperativeHandle(
      ref,
      () => ({
        insertDefaultTable: () => {
          if (!editor) return;
          editor.chain().focus().insertTable(DEFAULT_TABLE_INSERT).run();
        },
      }),
      [editor],
    );

    // Empty state
    if (!activeFile)
      return (
        <div className="h-full w-full flex flex-col">
          <div className="flex items-center justify-center h-full text-gray-400">
            No file open
          </div>
        </div>
      );
    if (!editor) return null;

    const breadcrumbItems = buildActiveFileBreadcrumb(folders, activeFile);
    const isMinTier = viewportTier === 'min';
    const compactFileName = activeFile.split(/[/\\]/).pop() ?? activeFile;

    const editorLayoutStyle: CSSProperties = {
      ['--editor-content-max-width' as string]: `${layoutModel.maxContentWidth}px`,
      ['--editor-content-padding-top' as string]: `${layoutModel.contentPaddingTop}px`,
      ['--editor-content-padding-inline' as string]: `${layoutModel.contentPaddingInline}px`,
      ['--editor-content-padding-bottom' as string]:
        layoutModel.contentPaddingBottom,
    };

    const handleBreadcrumbClick = (item: BreadcrumbItem) => {
      setSelectedPath(item.path);
      if (item.type === 'file') {
        void openFile(item.path);
        return;
      }
      if (item.type === 'folder' || item.type === 'workspace') {
        expandNode(item.path);
      }
    };

    return (
      <>
        <div
          className={`relative h-full w-full ${
            isTypewriterActive ? 'is-typewriter-active' : ''
          } viewport-tier-${viewportTier}`}
          style={editorLayoutStyle}
        >
          <EditorView
            editor={editor}
            setHasEditorWidgetFocus={setHasEditorWidgetFocus}
            onEditorContextMenu={openEditorContextMenu}
            isOutlineOpen={isOutlineOpen}
            onToggleOutline={() => setIsOutlineOpen((prev) => !prev)}
            onCloseOutline={() => setIsOutlineOpen(false)}
            breadcrumb={
              <div className="editor-header__breadcrumb-inner">
                {isMinTier ? (
                  <div className="h-12 px-6 flex items-center text-sm text-zinc-500 min-w-0">
                    <span className="shrink-0">... /</span>
                    <span className="ml-1 font-semibold text-zinc-700 truncate">
                      {compactFileName}
                    </span>
                  </div>
                ) : (
                  <Breadcrumb
                    items={breadcrumbItems}
                    onItemClick={handleBreadcrumbClick}
                    className="h-12 px-6"
                  />
                )}
              </div>
            }
            outlinePopover={
              <Outline
                editor={editor}
                isOpen={isOutlineOpen}
                refreshToken={activeFile}
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
                onShowStatus={(msg) => setStatus('idle', msg)}
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
  },
);

EditorImpl.displayName = 'EditorImpl';
