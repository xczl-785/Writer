import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  createSingleDocumentSessionShellState,
  reduceSingleDocumentSessionShell,
  selectSingleDocumentSessionShellView,
} from './singleDocumentSessionShell';

describe('singleDocumentSessionShell', () => {
  it('exposes a pure app-shell contract for opening, editing, saving, and closing one document', () => {
    const opened = reduceSingleDocumentSessionShell(
      createSingleDocumentSessionShellState(),
      {
        type: 'openDocument',
        path: '/quick.md',
        content: 'first draft',
        contentVersion: 7,
      },
    );
    const edited = reduceSingleDocumentSessionShell(opened, {
      type: 'editDocument',
      content: 'second draft',
    });
    const saving = reduceSingleDocumentSessionShell(edited, {
      type: 'requestSave',
    });

    expect(selectSingleDocumentSessionShellView(edited)).toMatchObject({
      status: 'dirty',
      isDirty: true,
      canSave: true,
    });
    expect(selectSingleDocumentSessionShellView(saving)).toMatchObject({
      documentPath: '/quick.md',
      status: 'saving',
      isDirty: true,
      canSave: false,
      canCloseWithoutSaving: false,
      pendingSaveTargetKind: 'file',
      saveTargetKind: 'file',
      documentKind: 'file',
      pendingSave: {
        target: { path: '/quick.md' },
        content: 'second draft',
        contentVersion: 8,
      },
    });

    const saved = reduceSingleDocumentSessionShell(saving, {
      type: 'saveSettled',
      result: {
        ok: true,
        target: { path: '/quick.md' },
        savedAt: 1,
      },
    });
    const closed = reduceSingleDocumentSessionShell(saved, {
      type: 'closeDocument',
    });

    expect(selectSingleDocumentSessionShellView(saved)).toMatchObject({
      status: 'open',
      isDirty: false,
      canCloseWithoutSaving: true,
      pendingSave: null,
      pendingSaveTargetKind: null,
      lastSaveError: null,
    });
    expect(selectSingleDocumentSessionShellView(closed)).toMatchObject({
      documentPath: null,
      status: 'closed',
      pendingSave: null,
    });
  });

  it('keeps the shell dirty when editing continues while an older save is pending', () => {
    const opened = reduceSingleDocumentSessionShell(
      createSingleDocumentSessionShellState(),
      {
        type: 'openDocument',
        path: '/quick.md',
        content: 'first draft',
        contentVersion: 1,
      },
    );
    const edited = reduceSingleDocumentSessionShell(opened, {
      type: 'editDocument',
      content: 'second draft',
    });
    const saving = reduceSingleDocumentSessionShell(edited, {
      type: 'requestSave',
    });
    const editedAgain = reduceSingleDocumentSessionShell(saving, {
      type: 'editDocument',
      content: 'third draft',
    });
    const stillSavingOriginal = reduceSingleDocumentSessionShell(editedAgain, {
      type: 'requestSave',
    });
    const oldSaveSettled = reduceSingleDocumentSessionShell(
      stillSavingOriginal,
      {
        type: 'saveSettled',
        result: {
          ok: true,
          target: { path: '/quick.md' },
          savedAt: 1,
        },
      },
    );
    const latestSaving = reduceSingleDocumentSessionShell(oldSaveSettled, {
      type: 'requestSave',
    });
    const latestSaved = reduceSingleDocumentSessionShell(latestSaving, {
      type: 'saveSettled',
      result: {
        ok: true,
        target: { path: '/quick.md' },
        savedAt: 2,
      },
    });

    expect(
      selectSingleDocumentSessionShellView(stillSavingOriginal),
    ).toMatchObject({
      status: 'dirty',
      isDirty: true,
      canCloseWithoutSaving: false,
      pendingSave: {
        content: 'second draft',
        contentVersion: 2,
      },
    });
    expect(selectSingleDocumentSessionShellView(oldSaveSettled)).toMatchObject({
      status: 'dirty',
      isDirty: true,
      canCloseWithoutSaving: false,
      pendingSave: null,
    });
    expect(oldSaveSettled.session.savedVersion).toBe(2);
    expect(oldSaveSettled.session.contentVersion).toBe(3);
    expect(selectSingleDocumentSessionShellView(latestSaving)).toMatchObject({
      pendingSave: {
        content: 'third draft',
        contentVersion: 3,
      },
    });
    expect(selectSingleDocumentSessionShellView(latestSaved)).toMatchObject({
      status: 'open',
      isDirty: false,
      canCloseWithoutSaving: true,
    });
  });

  it('returns to dirty state when the app-shell feeds back a failed SaveResult', () => {
    const opened = reduceSingleDocumentSessionShell(
      createSingleDocumentSessionShellState(),
      { type: 'openDocument', path: '/quick.md', content: 'draft' },
    );
    const edited = reduceSingleDocumentSessionShell(opened, {
      type: 'editDocument',
      content: 'draft 2',
    });
    const saving = reduceSingleDocumentSessionShell(edited, {
      type: 'requestSave',
    });
    const error = new Error('denied');
    const failed = reduceSingleDocumentSessionShell(saving, {
      type: 'saveSettled',
      result: {
        ok: false,
        target: { path: '/quick.md' },
        error,
        failedAt: 2,
      },
    });

    expect(selectSingleDocumentSessionShellView(failed)).toMatchObject({
      status: 'dirty',
      isDirty: true,
      pendingSave: null,
      pendingSaveTargetKind: null,
      lastSaveError: error,
    });
  });

  it('does not update shell content or dirty state when editing an empty session', () => {
    const empty = createSingleDocumentSessionShellState();
    const edited = reduceSingleDocumentSessionShell(empty, {
      type: 'editDocument',
      content: 'orphan draft',
    });

    expect(edited.content).toBe('');
    expect(selectSingleDocumentSessionShellView(edited)).toMatchObject({
      status: 'empty',
      isDirty: false,
      canSave: false,
    });
  });

  it('does not update shell content or dirty state when editing a closed session', () => {
    const opened = reduceSingleDocumentSessionShell(
      createSingleDocumentSessionShellState(),
      {
        type: 'openDocument',
        path: '/quick.md',
        content: 'saved draft',
        contentVersion: 4,
      },
    );
    const closed = reduceSingleDocumentSessionShell(opened, {
      type: 'closeDocument',
    });
    const edited = reduceSingleDocumentSessionShell(closed, {
      type: 'editDocument',
      content: 'closed draft',
    });

    expect(edited.content).toBe('');
    expect(selectSingleDocumentSessionShellView(edited)).toMatchObject({
      status: 'closed',
      isDirty: false,
      canSave: false,
    });
  });

  it('continues to edit temporary recovery documents', () => {
    const opened = reduceSingleDocumentSessionShell(
      createSingleDocumentSessionShellState(),
      {
        type: 'openTemporaryDocument',
        recoveryPath: '/app/recovery/drafts/d2.md',
        content: 'restored',
        contentVersion: 3,
      },
    );
    const edited = reduceSingleDocumentSessionShell(opened, {
      type: 'editDocument',
      content: 'restored edit',
    });

    expect(edited.content).toBe('restored edit');
    expect(selectSingleDocumentSessionShellView(edited)).toMatchObject({
      status: 'dirty',
      isDirty: true,
      documentKind: 'temporary',
      saveTargetKind: 'recovery',
    });
  });

  it('continues to edit file-backed documents', () => {
    const opened = reduceSingleDocumentSessionShell(
      createSingleDocumentSessionShellState(),
      {
        type: 'openDocument',
        path: '/quick.md',
        content: 'saved draft',
        contentVersion: 5,
      },
    );
    const edited = reduceSingleDocumentSessionShell(opened, {
      type: 'editDocument',
      content: 'file edit',
    });

    expect(edited.content).toBe('file edit');
    expect(selectSingleDocumentSessionShellView(edited)).toMatchObject({
      status: 'dirty',
      isDirty: true,
      documentKind: 'file',
      saveTargetKind: 'file',
    });
  });

  it('saves a temporary recovery document back to its recovery path', () => {
    const opened = reduceSingleDocumentSessionShell(
      createSingleDocumentSessionShellState(),
      {
        type: 'openTemporaryDocument',
        recoveryPath: '/app/recovery/drafts/d1.md',
        content: 'restored',
        contentVersion: 1,
      },
    );
    const edited = reduceSingleDocumentSessionShell(opened, {
      type: 'editDocument',
      content: 'restored edit',
    });
    const saving = reduceSingleDocumentSessionShell(edited, {
      type: 'requestSave',
    });

    expect(selectSingleDocumentSessionShellView(opened)).toMatchObject({
      documentPath: null,
      documentKind: 'temporary',
      displayLabel: 'Recovered draft',
      saveTargetKind: 'recovery',
    });
    expect(selectSingleDocumentSessionShellView(saving)).toMatchObject({
      status: 'saving',
      pendingSaveTargetKind: 'recovery',
      pendingSave: {
        target: { path: '/app/recovery/drafts/d1.md' },
        content: 'restored edit',
        contentVersion: 2,
      },
    });
    expect(selectSingleDocumentSessionShellView(saving)).not.toMatchObject({
      displayLabel: '/app/recovery/drafts/d1.md',
    });
  });

  it('clears lastSaveError after a successful retry', () => {
    const opened = reduceSingleDocumentSessionShell(
      createSingleDocumentSessionShellState(),
      { type: 'openDocument', path: '/quick.md', content: 'draft' },
    );
    const edited = reduceSingleDocumentSessionShell(opened, {
      type: 'editDocument',
      content: 'draft 2',
    });
    const saving = reduceSingleDocumentSessionShell(edited, {
      type: 'requestSave',
    });
    const error = new Error('denied');
    const failed = reduceSingleDocumentSessionShell(saving, {
      type: 'saveSettled',
      result: {
        ok: false,
        target: { path: '/quick.md' },
        error,
        failedAt: 2,
      },
    });
    const retrying = reduceSingleDocumentSessionShell(failed, {
      type: 'requestSave',
    });
    const saved = reduceSingleDocumentSessionShell(retrying, {
      type: 'saveSettled',
      result: {
        ok: true,
        target: { path: '/quick.md' },
        savedAt: 3,
      },
    });

    expect(selectSingleDocumentSessionShellView(failed).lastSaveError).toBe(
      error,
    );
    expect(selectSingleDocumentSessionShellView(retrying).lastSaveError).toBe(
      null,
    );
    expect(selectSingleDocumentSessionShellView(saved)).toMatchObject({
      status: 'open',
      isDirty: false,
      lastSaveError: null,
    });
  });

  it('keeps the shell implementation free of Writer app dependencies', () => {
    const source = readFileSync(
      'src/core/session/singleDocumentSessionShell.ts',
      'utf8',
    );

    expect(source).not.toMatch(
      /workspaceStore|fileTree|RecentItems|FileWatcher|watcher|AutosaveService/,
    );
  });
});
