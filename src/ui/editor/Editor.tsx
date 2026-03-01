import {
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
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import BaseTableHeader from '@tiptap/extension-table-header';
import BaseTableCell from '@tiptap/extension-table-cell';
import { useEditorStore } from '../../state/slices/editorSlice';
import { useFileTreeStore } from '../../state/slices/filetreeSlice';
import { useStatusStore } from '../../state/slices/statusSlice';
import { useWorkspaceStore } from '../../state/slices/workspaceSlice';
import { ErrorService } from '../../services/error/ErrorService';
import { MarkdownService } from '../../services/markdown/MarkdownService';
import { AutosaveService } from '../../services/autosave/AutosaveService';
import { ImageResolver } from '../../services/images/ImageResolver';
import { t } from '../../i18n';
import {
  DEFAULT_TABLE_INSERT,
  FIND_MATCH_LIMIT,
  type ToolbarCommandId,
} from './constants';
import { EditorShell } from './components/EditorShell';
import { FindReplacePanel } from './components/FindReplacePanel';
import { useImagePaste } from './useImagePaste';
import { createHandleDOMEvents } from './pasteHandler';
import {
  createEditorKeyDownHandler,
  createFindReplaceShortcutExtension,
  createToolbarShortcutExtension,
} from './extensions';
import { useTransientStatus } from './useTransientStatus';
import { useFindReplace } from './useFindReplace';
import { useToolbarCommands } from './useToolbarCommands';
import { ContextMenu, useContextMenu } from '../components/ContextMenu';
import { Breadcrumb } from '../components/Breadcrumb/Breadcrumb';
import {
  buildBreadcrumb,
  type BreadcrumbItem,
} from '../components/Breadcrumb/useBreadcrumb';
import { openFile } from '../../workspace/WorkspaceManager';
import { Outline } from '../components/Outline';
import { BlockBoundaryExtension } from '../components/BlockBoundary';
import {
  useSlashMenu,
  SlashMenu,
  SlashInline,
  useBubbleMenu,
  BubbleMenu,
  GhostHint,
} from './menus';
import { useSafeCoords, useGhostHint, useUndoRedo } from './hooks';
import { createMenuCommandHandler, createContextMenuOpener } from './handlers';
import '../components/BlockBoundary/blockBoundary.css';
import './Editor.css';

export type EditorHandle = {
  insertDefaultTable: () => void;
};

type EditorProps = {
  isSidebarVisible?: boolean;
  onToggleSidebar?: () => void;
};

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
] as const;

const withSourceMarkers = <T,>(_markers: readonly string[], value: T): T =>
  value;

export const Editor = forwardRef<EditorHandle, EditorProps>(
  ({ isSidebarVisible = true, onToggleSidebar }, ref) => {
    const { activeFile, currentPath } = useWorkspaceStore();
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
      slashState,
      slashCommands,
      slashSelectedIndex,
      setSlashSelectedIndex,
      executeCommand,
    } = useSlashMenu({
      editor: editorRef.current,
      defaultTableInsert: DEFAULT_TABLE_INSERT,
      getSafeCoordsAtPos,
    });

    // Ghost hint & bubble menu
    const ghostHintPosition = useGhostHint(
      editorRef.current,
      slashState.phase,
      getSafeCoordsAtPos,
    );
    const bubbleMenuPosition = useBubbleMenu(editorRef.current);

    // Find replace & toolbar
    const findReplace = useFindReplace({
      editor: editorRef.current,
      editorRevision,
      setTransientStatus,
    });
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
        BlockBoundaryExtension,
        StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] } }),
        Table.configure({ resizable: true, allowTableNodeSelection: false }),
        TableRow,
        BaseTableHeader.extend({
          addAttributes() {
            return {
              ...this.parent?.(),
              textAlign: {
                default: 'left',
                renderHTML: (attributes) =>
                  attributes.textAlign
                    ? { style: `text-align: ${attributes.textAlign}` }
                    : {},
              },
              borderHidden: {
                default: false,
                renderHTML: (attributes) =>
                  attributes.borderHidden
                    ? { style: 'border-style: none' }
                    : {},
              },
            };
          },
        }),
        BaseTableCell.extend({
          addAttributes() {
            return {
              ...this.parent?.(),
              textAlign: {
                default: 'left',
                renderHTML: (attributes) =>
                  attributes.textAlign
                    ? { style: `text-align: ${attributes.textAlign}` }
                    : {},
              },
              borderHidden: {
                default: false,
                renderHTML: (attributes) =>
                  attributes.borderHidden
                    ? { style: 'border-style: none' }
                    : {},
              },
            };
          },
        }),
        Image.extend({
          addAttributes() {
            return {
              ...this.parent?.(),
              src: {
                default: null,
                renderHTML: (attributes) => ({
                  src: ImageResolver.resolve(attributes.src, activeFile),
                }),
              },
            };
          },
        }),
      ],
      [activeFile, findReplaceShortcutExtension, toolbarShortcutExtension],
    );

    const editor = useEditor(
      {
        extensions,
        content: '',
        editorProps: {
          attributes: { class: 'editor-content h-full focus:outline-none' },
          handleDOMEvents: createHandleDOMEvents((event) =>
            handlePaste(event, editorRef.current),
          ),
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
            createEditorKeyDownHandler(),
          ),
        },
        onUpdate: async ({ editor }: { editor: TiptapEditor }) => {
          if (isLoading || !activeFile) return;
          try {
            let markdown = await MarkdownService.serialize(editor.getJSON());
            markdown = markdown.replace(/\xA0/g, ' ');
            markdown = markdown.replace(/\|\s*&nbsp;\s*(?=\|)/g, '|   ');
            updateFileContent(activeFile, markdown);
            setDirty(activeFile, true);
            AutosaveService.schedule(activeFile, markdown);
          } catch (error) {
            ErrorService.handle(error, 'Failed to serialize editor content');
          }
        },
        onBlur: () => {
          if (activeFile) AutosaveService.flush(activeFile);
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

    // Update toolbar command runner
    useEffect(() => {
      if (!editor) return;
      toolbarCommandRunnerRef.current = (id) => runToolbarCommand(editor, id);
    }, [editor, runToolbarCommand]);

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
          if (isMounted)
            editor.commands.setContent(json, { emitUpdate: false });
        } catch (error) {
          ErrorService.handle(error, 'Failed to load editor content');
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
      const onMenuCommand = createMenuCommandHandler(
        editor,
        findReplace,
        setStatus,
        setIsOutlineOpen,
      );
      window.addEventListener(
        'writer:editor-command',
        onMenuCommand as EventListener,
      );
      return () =>
        window.removeEventListener(
          'writer:editor-command',
          onMenuCommand as EventListener,
        );
    }, [editor, findReplace, setStatus]);

    // Context menu handler
    const openEditorContextMenu = useCallback(
      (event: ReactMouseEvent) => {
        if (!editor) return;
        const opener = createContextMenuOpener(
          editor,
          contextMenu,
          copyText,
          setStatus,
        );
        opener(event);
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
          {isSidebarVisible ? null : (
            <header className="editor-header">
              <div className="editor-header__breadcrumb">
                <div className="editor-header__breadcrumb-inner">
                  <button
                    type="button"
                    className="editor-header__sidebar-btn"
                    onClick={onToggleSidebar}
                    aria-label="Expand sidebar"
                    title="Expand Sidebar"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect x="3.5" y="4" width="17" height="16" rx="2" />
                      <line x1="9.2" y1="4" x2="9.2" y2="20" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="editor-header__actions" />
            </header>
          )}
          <div className="flex items-center justify-center h-full text-gray-400">
            No file open
          </div>
        </div>
      );
    if (!editor) return null;

    const breadcrumbItems = buildBreadcrumb(currentPath, activeFile);

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
        <div className="relative h-full w-full">
          <EditorShell
            editor={editor}
            setHasEditorWidgetFocus={setHasEditorWidgetFocus}
            onEditorContextMenu={openEditorContextMenu}
            isOutlineOpen={isOutlineOpen}
            onToggleOutline={() => setIsOutlineOpen((prev) => !prev)}
            onCloseOutline={() => setIsOutlineOpen(false)}
            breadcrumb={
              <div className="editor-header__breadcrumb-inner">
                {!isSidebarVisible ? (
                  <button
                    type="button"
                    className="editor-header__sidebar-btn"
                    onClick={onToggleSidebar}
                    aria-label="Expand sidebar"
                    title="Expand Sidebar"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect x="3.5" y="4" width="17" height="16" rx="2" />
                      <line x1="9.2" y1="4" x2="9.2" y2="20" />
                    </svg>
                  </button>
                ) : null}
                <Breadcrumb
                  items={breadcrumbItems}
                  onItemClick={handleBreadcrumbClick}
                  className="h-12 px-6"
                />
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
            slashMenu={
              <SlashMenu
                isOpen={slashState.phase !== 'idle'}
                x={slashState.menuX}
                y={slashState.menuY}
                commands={slashCommands}
                selectedIndex={slashSelectedIndex}
                onSelect={executeCommand}
                onHover={setSlashSelectedIndex}
              />
            }
          />
          <SlashInline
            isOpen={slashState.phase !== 'idle'}
            x={slashState.inlineX}
            y={slashState.inlineY}
            query={slashState.query}
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

Editor.displayName = 'Editor';
