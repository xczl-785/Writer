import { beforeEach, describe, expect, it } from 'vitest';
import { useStatusStore } from './statusSlice';

describe('statusSlice save state', () => {
  beforeEach(() => {
    useStatusStore.setState({
      status: 'idle',
      message: null,
      saveStatus: 'saved',
      lastSavedAt: null,
      saveError: null,
    });
  });

  it('marks dirty when content changes', () => {
    useStatusStore.getState().markDirty();
    expect(useStatusStore.getState().saveStatus).toBe('dirty');
  });

  it('transitions to saving then saved', () => {
    useStatusStore.getState().markSaving('test.md');
    expect(useStatusStore.getState().saveStatus).toBe('saving');
    expect(useStatusStore.getState().message).toBe('Saving test.md...');

    useStatusStore.getState().markSaved('Saved');
    expect(useStatusStore.getState().saveStatus).toBe('saved');
    expect(useStatusStore.getState().lastSavedAt).not.toBeNull();
    expect(useStatusStore.getState().message).toBe('Saved');
  });

  it('stores save error details', () => {
    useStatusStore
      .getState()
      .setSaveError('No permission', 'Save as another file');
    const state = useStatusStore.getState();
    expect(state.saveStatus).toBe('error');
    expect(state.status).toBe('error');
    expect(state.saveError?.reason).toBe('No permission');
    expect(state.saveError?.suggestion).toBe('Save as another file');
  });
});
