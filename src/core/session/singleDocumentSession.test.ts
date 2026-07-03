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
      savedVersion: dirty.contentVersion,
    });

    expect(open).toEqual({
      documentPath: '/note.md',
      sourcePath: '/note.md',
      recoveryPath: null,
      saveTargetKind: 'file',
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

  it('keeps later edits dirty when an older save succeeds', () => {
    const open = reduceSingleDocumentSession(
      createEmptySingleDocumentSession(),
      {
        type: 'opened',
        path: '/note.md',
        contentVersion: 3,
      },
    );
    const dirty = reduceSingleDocumentSession(open, { type: 'edited' });
    const saving = reduceSingleDocumentSession(dirty, { type: 'saveStarted' });
    const editedAgain = reduceSingleDocumentSession(saving, { type: 'edited' });
    const settled = reduceSingleDocumentSession(editedAgain, {
      type: 'saveSucceeded',
      savedVersion: dirty.contentVersion,
    });

    expect(settled.status).toBe('dirty');
    expect(settled.contentVersion).toBe(5);
    expect(settled.savedVersion).toBe(4);
    expect(isSingleDocumentSessionDirty(settled)).toBe(true);
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

  it('expresses a temporary recovery document without a documentPath', () => {
    const temporary = reduceSingleDocumentSession(
      createEmptySingleDocumentSession(),
      {
        type: 'openedTemporary',
        recoveryPath: '/recovery/drafts/d1.md',
        contentVersion: 2,
      },
    );
    const dirty = reduceSingleDocumentSession(temporary, { type: 'edited' });

    expect(temporary).toEqual({
      documentPath: null,
      sourcePath: null,
      recoveryPath: '/recovery/drafts/d1.md',
      saveTargetKind: 'recovery',
      status: 'open',
      contentVersion: 2,
      savedVersion: 2,
    });
    expect(dirty.status).toBe('dirty');
    expect(dirty.contentVersion).toBe(3);
  });

  it('expresses a file-backed document separately from recovery state', () => {
    const fileBacked = reduceSingleDocumentSession(
      createEmptySingleDocumentSession(),
      { type: 'openedFile', path: '/docs/note.md', contentVersion: 4 },
    );

    expect(fileBacked).toMatchObject({
      documentPath: '/docs/note.md',
      sourcePath: '/docs/note.md',
      recoveryPath: null,
      saveTargetKind: 'file',
      status: 'open',
      contentVersion: 4,
      savedVersion: 4,
    });
  });
});
