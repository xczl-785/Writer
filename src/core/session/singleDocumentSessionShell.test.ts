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
      pendingSave: {
        target: { path: '/quick.md' },
        content: 'second draft',
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
    });
    expect(selectSingleDocumentSessionShellView(closed)).toMatchObject({
      documentPath: null,
      status: 'closed',
      pendingSave: null,
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
    const failed = reduceSingleDocumentSessionShell(saving, {
      type: 'saveSettled',
      result: {
        ok: false,
        target: { path: '/quick.md' },
        error: new Error('denied'),
        failedAt: 2,
      },
    });

    expect(selectSingleDocumentSessionShellView(failed)).toMatchObject({
      status: 'dirty',
      isDirty: true,
      pendingSave: null,
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
