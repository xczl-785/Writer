import { EditorContent, type Editor as TiptapEditor } from '@tiptap/react';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { isEditorHeaderVisible } from '../../../../ui/chrome/headerVisibilityPolicy';

type Props = {
  editor: TiptapEditor;
  setHasEditorWidgetFocus: (focused: boolean) => void;
  onEditorContextMenu: (event: ReactMouseEvent) => void;
  bubbleMenu?: ReactNode;
  ghostHint?: ReactNode;
  slashMenu?: ReactNode;
  breadcrumb: ReactNode;
  findReplacePanel?: ReactNode;
  isOutlineOpen: boolean;
  onToggleOutline: () => void;
  onCloseOutline: () => void;
  outlinePopover?: ReactNode;
  isFocusZen?: boolean;
  isHeaderAwake?: boolean;
};

export function EditorShell({
  editor,
  setHasEditorWidgetFocus,
  onEditorContextMenu,
  bubbleMenu,
  ghostHint,
  slashMenu,
  breadcrumb,
  findReplacePanel,
  isOutlineOpen,
  onToggleOutline,
  onCloseOutline,
  outlinePopover,
  isFocusZen = false,
  isHeaderAwake = true,
}: Props) {
  const outlineAreaRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isHeaderVisible = isEditorHeaderVisible({ isFocusZen, isHeaderAwake });

  useEffect(() => {
    if (!isOutlineOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!outlineAreaRef.current?.contains(event.target as Node)) {
        onCloseOutline();
      }
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    return () =>
      document.removeEventListener('pointerdown', onPointerDown, true);
  }, [isOutlineOpen, onCloseOutline]);

  useLayoutEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const scrollContainer = root.querySelector(
      '.editor-content-area',
    ) as HTMLElement | null;
    if (!scrollContainer) return;

    let rafId: number | null = null;
    const syncOffsetVariable = () => {
      const findPanel = root.querySelector(
        '.editor-find-panel',
      ) as HTMLElement | null;

      let offsetTop = 0;
      if (findPanel) {
        const panelRect = findPanel.getBoundingClientRect();
        const scrollRect = scrollContainer.getBoundingClientRect();
        offsetTop = Math.max(0, Math.round(panelRect.bottom - scrollRect.top));
      }

      scrollContainer.style.setProperty(
        '--editor-content-offset-top',
        `${offsetTop}px`,
      );
    };

    const scheduleSync = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        syncOffsetVariable();
      });
    };

    const observer = new ResizeObserver(() => scheduleSync());
    observer.observe(scrollContainer);
    const findPanel = root.querySelector(
      '.editor-find-panel',
    ) as HTMLElement | null;
    if (findPanel) {
      observer.observe(findPanel);
    }
    window.addEventListener('resize', scheduleSync);
    scheduleSync();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', scheduleSync);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      scrollContainer.style.removeProperty('--editor-content-offset-top');
    };
  }, [findReplacePanel]);

  return (
    <div
      ref={containerRef}
      className="editor-container h-full w-full flex flex-col"
      onFocusCapture={() => setHasEditorWidgetFocus(true)}
      onBlurCapture={(event) => {
        const nextFocused = event.relatedTarget as Node | null;
        if (!nextFocused || !event.currentTarget.contains(nextFocused)) {
          setHasEditorWidgetFocus(false);
        }
      }}
    >
      <header
        className={`editor-header ${
          !isHeaderVisible ? 'editor-header--focus-zen-hidden' : ''
        }`}
      >
        <div className="editor-header__breadcrumb">{breadcrumb}</div>
        <div className="editor-header__actions" ref={outlineAreaRef}>
          <button
            type="button"
            className="editor-header__outline-btn"
            aria-label="Toggle outline"
            title="Toggle Outline (Shift+Mod+O)"
            onClick={onToggleOutline}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </button>
          {outlinePopover}
        </div>
      </header>
      <div className="editor-find-panel-host">{findReplacePanel}</div>
      {bubbleMenu}
      {ghostHint}
      {slashMenu}
      <EditorContent
        editor={editor}
        className="editor-content-area"
        onContextMenu={onEditorContextMenu}
      />
    </div>
  );
}
