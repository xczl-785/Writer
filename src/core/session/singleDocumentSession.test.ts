import { describe, expect, it } from 'vitest';
import {
  createEmptySingleDocumentSession,
  isSingleDocumentSessionDirty,
  reduceSingleDocumentSession,
} from './singleDocumentSession';

describe('singleDocumentSession', () => {
  it('tracks a single document edit and save lifecycle', () => {
    const empty = createEmptySingleDocumentSession();
    const open = reduceSingleDocumentSession(empty, {
      type: 'opened',
      path: '/note.md',
      contentVersion: 3,
    });
    const dirty = reduceSingleDocumentSession(open, { type: 'edited' });
    const saving = reduceSingleDocumentSession(dirty, { type: 'saveStarted' });
    const saved = reduceSingleDocumentSession(saving, {
      type: 'saveSucceeded',
    });

    expect(open).toEqual({
      documentPath: '/note.md',
      status: 'open',
      contentVersion: 3,
      savedVersion: 3,
    });
    expect(dirty.status).toBe('dirty');
    expect(dirty.contentVersion).toBe(4);
    expect(isSingleDocumentSessionDirty(dirty)).toBe(true);
    expect(saving.status).toBe('saving');
    expect(saved.status).toBe('open');
    expect(isSingleDocumentSessionDirty(saved)).toBe(false);
  });

  it('returns to dirty after a failed save', () => {
    const open = reduceSingleDocumentSession(
      createEmptySingleDocumentSession(),
      { type: 'opened', path: '/note.md' },
    );
    const dirty = reduceSingleDocumentSession(open, { type: 'edited' });
    const saving = reduceSingleDocumentSession(dirty, { type: 'saveStarted' });
    const failed = reduceSingleDocumentSession(saving, { type: 'saveFailed' });

    expect(failed.status).toBe('dirty');
    expect(isSingleDocumentSessionDirty(failed)).toBe(true);
  });

  it('does not treat the model as a workspace lifecycle', () => {
    const open = reduceSingleDocumentSession(
      createEmptySingleDocumentSession(),
      { type: 'opened', path: '/note.md' },
    );
    const closed = reduceSingleDocumentSession(open, { type: 'closed' });
    const editedAfterClose = reduceSingleDocumentSession(closed, {
      type: 'edited',
    });

    expect(closed.documentPath).toBeNull();
    expect(closed.status).toBe('closed');
    expect(editedAfterClose).toBe(closed);
  });
});
