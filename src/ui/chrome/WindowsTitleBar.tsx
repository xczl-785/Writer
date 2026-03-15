import { useEffect, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Copy, Minus, Square, X } from 'lucide-react';
import { WindowsMenuBar } from './WindowsMenuBar';
import { SidebarToggleIcon } from './SidebarToggleIcon';
import type { AppChromeModel } from './chromeState';
import { useSidebarToggleBehavior } from './useSidebarToggleBehavior';

type WindowsTitleBarProps = {
  chrome: AppChromeModel;
};

const SIDEBAR_WIDTH = 256;

function BrandIcon() {
  return (
    <img
      src="/icon.svg"
      alt="Writer"
      className="h-6 w-6 object-contain"
      draggable={false}
    />
  );
}

async function minimizeWindow(): Promise<void> {
  try {
    await getCurrentWindow().minimize();
  } catch {
    // Ignore outside Tauri runtime.
  }
}

async function toggleMaximizeWindow(): Promise<void> {
  try {
    await getCurrentWindow().toggleMaximize();
  } catch {
    // Ignore outside Tauri runtime.
  }
}

async function closeWindow(): Promise<void> {
  try {
    await getCurrentWindow().close();
  } catch {
    // Ignore outside Tauri runtime.
  }
}

function isInteractiveTarget(target: HTMLElement | null): boolean {
  if (target?.closest('button')) {
    return true;
  }

  return (
    target?.closest(
      '[role="button"], a, input, textarea, select, [data-no-drag]',
    ) !== null
  );
}

export function WindowsTitleBar({ chrome }: WindowsTitleBarProps) {
  const { hasRecentItems, isSidebarVisible, isFocusZen, isVisible } =
    chrome.state;
  const { toggleSidebar, setFocusZen } = chrome.actions;
  const [isMaximized, setIsMaximized] = useState(false);
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  const leftWidth = isSidebarVisible ? SIDEBAR_WIDTH : 0;
  const rootInsetClass = isMaximized ? 'px-[8px] pt-[8px]' : '';
  const sidebarSurfaceClass = isMaximized ? 'rounded-tl-[10px]' : '';
  const mainSurfaceClass = isMaximized ? 'rounded-tr-[10px]' : '';
  const sidebarToggleBehavior = useSidebarToggleBehavior({
    isFocusZen,
    onToggleSidebar: toggleSidebar,
    onSetFocusZen: setFocusZen,
  });

  useEffect(() => {
    let mounted = true;
    const windowHandle = getCurrentWindow();
    let disposeResize: (() => void) | undefined;
    let disposeFocus: (() => void) | undefined;

    async function refreshWindowState(): Promise<void> {
      try {
        const nextIsMaximized = await windowHandle.isMaximized();
        if (mounted) {
          setIsMaximized(nextIsMaximized);
        }
      } catch {
        // Ignore outside Tauri runtime.
      }
    }

    void refreshWindowState();

    void windowHandle
      .onResized(() => {
        void refreshWindowState();
      })
      .then((unlisten) => {
        disposeResize = unlisten;
      })
      .catch(() => {
        // Ignore outside Tauri runtime.
      });

    void windowHandle
      .onFocusChanged((event) => {
        if (mounted) {
          setIsWindowFocused(event.payload);
        }
      })
      .then((unlisten) => {
        disposeFocus = unlisten;
      })
      .catch(() => {
        // Ignore outside Tauri runtime.
      });

    return () => {
      mounted = false;
      disposeResize?.();
      disposeFocus?.();
    };
  }, []);

  function handleTitleBarDoubleClick(
    event: ReactMouseEvent<HTMLDivElement>,
  ): void {
    const target = event.target as HTMLElement | null;
    if (isInteractiveTarget(target)) {
      return;
    }

    void toggleMaximizeWindow();
  }

  function beginWindowDrag(event: ReactMouseEvent<HTMLDivElement>): void {
    if (event.button !== 0) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (isInteractiveTarget(target)) {
      return;
    }

    const windowHandle = getCurrentWindow();
    void windowHandle.startDragging().catch(() => {
      // Ignore outside Tauri runtime.
    });
  }

  return (
    <div
      className={`relative z-30 flex shrink-0 select-none bg-white transition-[padding,background-color,opacity] duration-150 ${
        !isVisible ? 'opacity-0 pointer-events-none' : ''
      } ${rootInsetClass}`}
      data-window-focused={isWindowFocused}
      data-window-maximized={isMaximized}
      onDoubleClick={handleTitleBarDoubleClick}
    >
      <div
        className={`flex h-10 min-w-0 flex-1 border-b bg-white transition-colors ${
          isWindowFocused ? 'border-zinc-200' : 'border-zinc-100'
        }`}
      >
        <div
          className={`flex items-center gap-3 overflow-hidden bg-zinc-50 px-3 transition-[width,padding,border,background-color,border-radius] duration-300 ${sidebarSurfaceClass} ${
            isWindowFocused
              ? 'border-r border-zinc-200'
              : 'border-r border-zinc-100 bg-zinc-50/80'
          }`}
          data-tauri-drag-region
          onMouseDown={beginWindowDrag}
          style={{
            width: leftWidth,
            paddingLeft: isSidebarVisible ? 12 : 0,
            paddingRight: isSidebarVisible ? 12 : 0,
            borderRightWidth: isSidebarVisible ? 1 : 0,
          }}
        >
          <BrandIcon />
          <span className="text-[13px] font-semibold tracking-tight text-zinc-900">
            Writer
          </span>
        </div>

        <div
          className={`relative flex min-w-0 flex-1 items-center bg-white transition-[border-radius] duration-150 ${mainSurfaceClass}`}
          data-tauri-drag-region
          onMouseDown={beginWindowDrag}
        >
          <div className="relative z-10 flex min-w-0 flex-1 items-center pointer-events-none">
            <div className="flex items-center gap-2 px-2 pointer-events-auto">
              <button
                type="button"
                data-no-drag
                onClick={sidebarToggleBehavior.onClick}
                onDoubleClick={sidebarToggleBehavior.onDoubleClick}
                className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
                aria-label="Toggle Sidebar"
                title="Toggle Sidebar"
              >
                <SidebarToggleIcon />
              </button>
              <WindowsMenuBar
                hasRecentItems={hasRecentItems}
                platform="windows"
              />
            </div>

            <div
              className="min-w-0 flex-1 self-stretch"
              data-tauri-drag-region
              onMouseDown={beginWindowDrag}
            />

            <div className="flex items-center pointer-events-auto">
              <button
                type="button"
                data-no-drag
                className="flex h-10 w-[46px] items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-zinc-100 active:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
                onClick={() => void minimizeWindow()}
                aria-label="Minimize"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                type="button"
                data-no-drag
                className="flex h-10 w-[46px] items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-zinc-100 active:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
                onClick={() => void toggleMaximizeWindow()}
                aria-label="Toggle Maximize"
              >
                {isMaximized ? (
                  <Copy className="h-[13px] w-[13px]" />
                ) : (
                  <Square className="h-[13px] w-[13px]" />
                )}
              </button>
              <button
                type="button"
                data-no-drag
                className="flex h-10 w-[46px] items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-red-500 hover:text-white active:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
                onClick={() => void closeWindow()}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
