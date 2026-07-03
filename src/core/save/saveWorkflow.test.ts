import { describe, expect, it } from 'vitest';
import { isTerminalSaveStatus, reduceSaveStatus } from './saveWorkflow';

describe('saveWorkflow', () => {
  const target = { path: '/note.md' };

  it('reduces the basic save lifecycle', () => {
    const dirty = reduceSaveStatus('idle', { type: 'scheduled', target });
    const saving = reduceSaveStatus(dirty, { type: 'started', target });
    const saved = reduceSaveStatus(saving, {
      type: 'succeeded',
      target,
      savedAt: 1,
    });

    expect(dirty).toBe('dirty');
    expect(saving).toBe('saving');
    expect(saved).toBe('saved');
  });

  it('keeps cancellation scoped to unsaved dirty work', () => {
    expect(reduceSaveStatus('dirty', { type: 'cancelled', target })).toBe(
      'idle',
    );
    expect(reduceSaveStatus('saving', { type: 'cancelled', target })).toBe(
      'saving',
    );
  });

  it('identifies terminal save states', () => {
    expect(isTerminalSaveStatus('saved')).toBe(true);
    expect(isTerminalSaveStatus('failed')).toBe(true);
    expect(isTerminalSaveStatus('saving')).toBe(false);
  });
});
