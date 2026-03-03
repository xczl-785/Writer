import { beforeEach, describe, expect, it } from 'vitest';
import { useViewModeStore } from './viewModeSlice';

describe('viewModeSlice', () => {
  beforeEach(() => {
    useViewModeStore.setState({
      isZen: false,
      isFocusZen: false,
      isTypewriterActive: false,
      typewriterRestoreSnapshot: null,
    });
  });

  it('forces typewriter on when entering zen and restores previous preference on exit', () => {
    useViewModeStore.getState().enterZen(false);
    expect(useViewModeStore.getState().isZen).toBe(true);
    expect(useViewModeStore.getState().isTypewriterActive).toBe(true);

    useViewModeStore.getState().exitZen();
    expect(useViewModeStore.getState().isZen).toBe(false);
    expect(useViewModeStore.getState().isTypewriterActive).toBe(false);
  });

  it('restores enabled preference when leaving zen', () => {
    useViewModeStore.getState().enterZen(true);
    useViewModeStore.getState().exitZen();
    expect(useViewModeStore.getState().isTypewriterActive).toBe(true);
  });

  it('derives active typewriter state from user preference outside zen', () => {
    useViewModeStore.getState().syncTypewriterFromUserPreference(true);
    expect(useViewModeStore.getState().isTypewriterActive).toBe(true);

    useViewModeStore.getState().enterZen(true);
    useViewModeStore.getState().syncTypewriterFromUserPreference(false);
    expect(useViewModeStore.getState().isTypewriterActive).toBe(true);
  });
});

