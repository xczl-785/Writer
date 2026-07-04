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
import { type Editor as TiptapEditor } from '@tiptap/react';
import { t } from '../../../shared/i18n';
import {
  DEFAULT_TABLE_INSERT,
  FIND_MATCH_LIMIT,
  type ToolbarCommandId,
} from './constants';
import { FindReplacePanel } from '../ui/components/FindReplacePanel';
import { useImagePaste } from '../hooks/useImagePaste';
import { applyImageAction } from '../hooks/imageActions';
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
  openEditorContextMenu as openEditorContextMenuBridge,
} from '../integration';
import { hasActiveOverlayInDom } from '../domain';
import { useEditorStateFacade } from './EditorStateFacade';
import { useEditorInstanceController } from './useEditorInstanceController';
import { WriterEditorBreadcrumb } from '../ui/components/WriterEditorBreadcrumb';
import '../../../ui/components/BlockBoundary/blockBoundary.css';
import './Editor.css';
import type { EditorHandle, EditorProps } from './editorTypes';

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
    const {
      workspace: { activeFile, folders },
      status: { setStatus },
      editor: { fileStates, updateFileContent, setDirty },
    } = useEditorStateFacade();
    const { handlePaste } = useImagePaste();
    const contextMenu = useContextMenu();

    const content = activeFile ? fileStates[activeFile]?.content || '' : '';
    const editorRef = useRef<TiptapEditor | null>(null);
    const shortcutRuntime = useMemo(() => createEditorShortcutRuntime(), []);
    const [currentEditor, setCurrentEditor] = useState<TiptapEditor | null>(
      null,
    );
    const [hasEditorWidgetFocus, setHasEditorWidgetFocus] = useState(false);
    const [editorRevision, forceEditorRevision] = useState(0);
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
      editor: currentEditor,
      defaultTableInsert: DEFAULT_TABLE_INSERT,
      imageAction: applyImageAction,
      getSafeCoordsAtPos,
    });

    // Ghost hint & bubble menu
    const ghostHintPosition = useGhostHint(
      currentEditor,
      slashSession.phase,
      getSafeCoordsAtPos,
    );
    const bubbleMenuPosition = useBubbleMenu(currentEditor);
    const linkTooltipState = useLinkTooltip(currentEditor);

    // Find replace & toolbar
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

    // Extensions
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

    const instanceExtensions = useMemo(
      () => [toolbarShortcutExtension, findReplaceShortcutExtension],
      [findReplaceShortcutExtension, toolbarShortcutExtension],
    );

    const onEditorRevisionChange = useCallback(
      () => forceEditorRevision((t) => t + 1),
      [],
    );

    const { editor } = useEditorInstanceController({
      activeFile,
      content,
      editorRef,
      extensions: instanceExtensions,
      handlePaste,
      updateFileContent,
      setDirty,
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

    // Update toolbar command runner
    useEffect(() => {
      shortcutRuntime.setToolbarCommandRunner(
        editor ? (id) => runToolbarCommand(editor, id) : () => false,
      );
    }, [editor, runToolbarCommand, shortcutRuntime]);

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
        imageAction: applyImageAction,
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

    const isMinTier = viewportTier === 'min';

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
              <WriterEditorBreadcrumb
                activeFile={activeFile}
                folders={folders}
                isMinTier={isMinTier}
              />
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
