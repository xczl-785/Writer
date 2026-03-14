import { getCurrentWindow } from '@tauri-apps/api/window';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

type MacTitleBarProps = {
  hasRecentItems: boolean;
  isSidebarVisible: boolean;
  onToggleSidebar: () => void;
};

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

function TrafficLight({
  className,
  onClick,
}: {
  className: string;
  onClick: () => Promise<void>;
}) {
  return (
    <button
      type="button"
      onClick={() => void onClick()}
      className={`h-3 w-3 rounded-full border border-black/10 ${className}`}
      aria-hidden="true"
      tabIndex={-1}
    />
  );
}

export function MacTitleBar({
  hasRecentItems: _hasRecentItems,
  isSidebarVisible,
  onToggleSidebar,
}: MacTitleBarProps) {
  const leftWidth = isSidebarVisible ? 256 : 72;

  return (
    <div className="flex h-10 shrink-0 select-none border-b border-zinc-200 bg-white">
      <div
        className="flex items-center overflow-hidden border-r border-zinc-200 bg-zinc-50 transition-[width,border] duration-300"
        data-tauri-drag-region
        style={{
          width: leftWidth,
          borderRightWidth: isSidebarVisible ? 1 : 0,
        }}
      >
        <div className="flex items-center gap-2 pl-4">
          <TrafficLight className="bg-[#ff5f57]" onClick={closeWindow} />
          <TrafficLight className="bg-[#febc2e]" onClick={minimizeWindow} />
          <TrafficLight className="bg-[#28c840]" onClick={toggleMaximizeWindow} />
        </div>
      </div>
      <div className="relative flex min-w-0 flex-1 items-center bg-white">
        <div className="absolute inset-0" data-tauri-drag-region />
        <div className="relative z-10 flex min-w-0 flex-1 items-center pointer-events-none">
          <div className="flex items-center gap-2 px-3 pointer-events-auto">
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
          </div>
          <div className="min-w-0 flex-1" />
        </div>
      </div>
    </div>
  );
}
