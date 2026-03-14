import { useEffect, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Copy, Minus, PanelLeftClose, PanelLeftOpen, Square, X } from 'lucide-react';
import { WindowsMenuBar } from './WindowsMenuBar';

type WindowsTitleBarProps = {
  hasRecentItems: boolean;
  isSidebarVisible: boolean;
  onToggleSidebar: () => void;
};

const SIDEBAR_WIDTH = 256;

function PlaceholderBrandIcon() {
  return (
    <div className="flex h-6 w-6 items-center justify-center rounded-md border border-zinc-300 bg-white/80">
      <div className="h-2.5 w-2.5 rounded-[3px] bg-zinc-900" />
    </div>
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

export function WindowsTitleBar({
  hasRecentItems,
  isSidebarVisible,
  onToggleSidebar,
}: WindowsTitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  const leftWidth = isSidebarVisible ? SIDEBAR_WIDTH : 0;

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

    void windowHandle.onResized(() => {
        void refreshWindowState();
      })
      .then((unlisten) => {
        disposeResize = unlisten;
      })
      .catch(() => {
        // Ignore outside Tauri runtime.
      });

    void windowHandle.onFocusChanged((event) => {
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
    if (target?.closest('button')) {
      return;
    }

    void toggleMaximizeWindow();
  }

  return (
    <div
      className={`flex h-10 shrink-0 select-none border-b bg-white transition-colors ${
        isWindowFocused ? 'border-zinc-200' : 'border-zinc-100'
      }`}
      onDoubleClick={handleTitleBarDoubleClick}
    >
      <div
        className={`flex items-center gap-3 overflow-hidden bg-zinc-50 px-3 transition-[width,padding,border,background-color] duration-300 ${
          isWindowFocused ? 'border-r border-zinc-200' : 'border-r border-zinc-100 bg-zinc-50/80'
        }`}
        data-tauri-drag-region
        style={{
          width: leftWidth,
          paddingLeft: isSidebarVisible ? 12 : 0,
          paddingRight: isSidebarVisible ? 12 : 0,
          borderRightWidth: isSidebarVisible ? 1 : 0,
        }}
      >
        <PlaceholderBrandIcon />
        <span className="text-[13px] font-semibold tracking-tight text-zinc-900">
          Writer
        </span>
      </div>

      <div className="relative flex min-w-0 flex-1 items-center bg-white">
        <div className="absolute inset-0" data-tauri-drag-region />
        <div className="relative z-10 flex min-w-0 flex-1 items-center pointer-events-none">
          <div className="flex items-center gap-2 px-2 pointer-events-auto">
            <button
              type="button"
              onClick={onToggleSidebar}
              className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
              aria-label="Toggle Sidebar"
              title="Toggle Sidebar"
            >
              {isSidebarVisible ? (
                <PanelLeftClose className="h-[18px] w-[18px]" />
              ) : (
                <PanelLeftOpen className="h-[18px] w-[18px]" />
              )}
            </button>
            <WindowsMenuBar
              hasRecentItems={hasRecentItems}
              isSidebarVisible={isSidebarVisible}
              platform="windows"
            />
          </div>

          <div className="min-w-0 flex-1" />

          <div className="flex items-center pointer-events-auto">
            <button
              type="button"
              className="flex h-10 w-[46px] items-center justify-center text-zinc-600 transition-colors hover:bg-zinc-100 active:bg-zinc-200"
              onClick={() => void minimizeWindow()}
              aria-label="Minimize"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="flex h-10 w-[46px] items-center justify-center text-zinc-600 transition-colors hover:bg-zinc-100 active:bg-zinc-200"
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
              className="flex h-10 w-[46px] items-center justify-center text-zinc-600 transition-colors hover:bg-red-500 hover:text-white active:bg-red-600"
              onClick={() => void closeWindow()}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
