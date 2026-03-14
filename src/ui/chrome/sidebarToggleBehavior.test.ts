import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  handleSidebarToggleClick,
  handleSidebarToggleDoubleClick,
} from './useSidebarToggleBehavior';

describe('useSidebarToggleBehavior', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('toggles sidebar after a single click debounce when focus zen is off', () => {
    vi.useFakeTimers();
    const onToggleSidebar = vi.fn();
    const onSetFocusZen = vi.fn();
    const clickTimerRef = { current: null as number | null };

    handleSidebarToggleClick(
      {
        isFocusZen: false,
        onToggleSidebar,
        onSetFocusZen,
      },
      clickTimerRef,
    );

    expect(onToggleSidebar).not.toHaveBeenCalled();

    vi.advanceTimersByTime(220);

    expect(onToggleSidebar).toHaveBeenCalledTimes(1);
    expect(onSetFocusZen).not.toHaveBeenCalled();
  });

  it('double click toggles focus zen and cancels the pending single click action', () => {
    vi.useFakeTimers();
    const onToggleSidebar = vi.fn();
    const onSetFocusZen = vi.fn();
    const clickTimerRef = { current: null as number | null };

    handleSidebarToggleClick(
      {
        isFocusZen: false,
        onToggleSidebar,
        onSetFocusZen,
      },
      clickTimerRef,
    );
    handleSidebarToggleDoubleClick(
      { isFocusZen: false, onSetFocusZen },
      clickTimerRef,
    );
    vi.advanceTimersByTime(220);

    expect(onToggleSidebar).not.toHaveBeenCalled();
    expect(onSetFocusZen).toHaveBeenCalledWith(true);
  });

  it('single click exits focus zen before attempting a sidebar toggle', () => {
    vi.useFakeTimers();
    const onToggleSidebar = vi.fn();
    const onSetFocusZen = vi.fn();
    const clickTimerRef = { current: null as number | null };

    handleSidebarToggleClick(
      {
        isFocusZen: true,
        onToggleSidebar,
        onSetFocusZen,
      },
      clickTimerRef,
    );
    vi.advanceTimersByTime(220);

    expect(onSetFocusZen).toHaveBeenCalledWith(false);
    expect(onToggleSidebar).not.toHaveBeenCalled();
  });
});
