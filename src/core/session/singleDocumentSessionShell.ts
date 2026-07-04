import type { SaveInput, SaveResult } from '../save/saveTypes';
import {
  createEmptySingleDocumentSession,
  isSingleDocumentSessionDirty,
  reduceSingleDocumentSession,
  type DocumentKind,
  type SaveTargetKind,
  type SingleDocumentSessionState,
  type SingleDocumentSessionStatus,
} from './singleDocumentSession';

interface PendingSaveInput extends SaveInput {
  contentVersion: number;
}

export interface SingleDocumentSessionShellState {
  session: SingleDocumentSessionState;
  content: string;
  pendingSave: PendingSaveInput | null;
  pendingSaveTargetKind?: SaveTargetKind | null;
  lastSaveError?: unknown | null;
}

export type SingleDocumentSessionShellEvent =
  | {
      type: 'openDocument';
      path: string;
      content: string;
      contentVersion?: number;
    }
  | {
      type: 'openTemporaryDocument';
      recoveryPath: string;
      content: string;
      contentVersion?: number;
    }
  | { type: 'editDocument'; content: string }
  | { type: 'requestSave' }
  | { type: 'saveSettled'; result: SaveResult }
  | { type: 'closeDocument' };

export interface SingleDocumentSessionShellView {
  documentPath: string | null;
  status: SingleDocumentSessionStatus;
  isDirty: boolean;
  canSave: boolean;
  canCloseWithoutSaving: boolean;
  pendingSave: PendingSaveInput | null;
  pendingSaveTargetKind: SaveTargetKind | null;
  lastSaveError: unknown | null;
  saveTargetKind: SaveTargetKind | null;
  documentKind: DocumentKind;
  displayLabel: string | null;
}

export const createSingleDocumentSessionShellState =
  (): SingleDocumentSessionShellState => ({
    session: createEmptySingleDocumentSession(),
    content: '',
    pendingSave: null,
    pendingSaveTargetKind: null,
    lastSaveError: null,
  });

const getDocumentKind = (session: SingleDocumentSessionState): DocumentKind => {
  if (session.status === 'closed') {
    return 'closed';
  }
  if (session.sourcePath) {
    return 'file';
  }
  if (session.recoveryPath) {
    return 'temporary';
  }
  return 'empty';
};

const getDisplayLabel = (
  session: SingleDocumentSessionState,
): string | null => {
  if (session.sourcePath) {
    return session.sourcePath;
  }
  if (session.recoveryPath) {
    return 'Recovered draft';
  }
  return null;
};

const getSaveTargetPath = (
  session: SingleDocumentSessionState,
): string | null => {
  if (session.saveTargetKind === 'recovery') {
    return session.recoveryPath ?? null;
  }
  if (session.saveTargetKind === 'file') {
    return session.sourcePath ?? session.documentPath;
  }
  return session.documentPath ?? session.recoveryPath ?? null;
};

export const selectSingleDocumentSessionShellView = (
  state: SingleDocumentSessionShellState,
): SingleDocumentSessionShellView => {
  const isDirty = isSingleDocumentSessionDirty(state.session);
  return {
    documentPath: state.session.documentPath,
    status: state.session.status,
    isDirty,
    canSave: isDirty && state.session.status === 'dirty',
    canCloseWithoutSaving: !isDirty,
    pendingSave: state.pendingSave,
    pendingSaveTargetKind: state.pendingSaveTargetKind ?? null,
    lastSaveError: state.lastSaveError ?? null,
    saveTargetKind: state.session.saveTargetKind ?? null,
    documentKind: getDocumentKind(state.session),
    displayLabel: getDisplayLabel(state.session),
  };
};

export const reduceSingleDocumentSessionShell = (
  state: SingleDocumentSessionShellState,
  event: SingleDocumentSessionShellEvent,
): SingleDocumentSessionShellState => {
  switch (event.type) {
    case 'openDocument':
      return {
        session: reduceSingleDocumentSession(state.session, {
          type: 'opened',
          path: event.path,
          contentVersion: event.contentVersion,
        }),
        content: event.content,
        pendingSave: null,
        pendingSaveTargetKind: null,
        lastSaveError: null,
      };
    case 'openTemporaryDocument':
      return {
        session: reduceSingleDocumentSession(state.session, {
          type: 'openedTemporary',
          recoveryPath: event.recoveryPath,
          contentVersion: event.contentVersion,
        }),
        content: event.content,
        pendingSave: null,
        pendingSaveTargetKind: null,
        lastSaveError: null,
      };
    case 'editDocument': {
      const session = reduceSingleDocumentSession(state.session, {
        type: 'edited',
      });
      if (
        session === state.session ||
        session.status === 'empty' ||
        session.status === 'closed'
      ) {
        return session === state.session ? state : { ...state, session };
      }

      return {
        ...state,
        session,
        content: event.content,
      };
    }
    case 'requestSave': {
      const targetPath = getSaveTargetPath(state.session);
      if (targetPath === null || state.session.status !== 'dirty') {
        return state;
      }
      if (state.pendingSave) {
        return state;
      }

      const session = reduceSingleDocumentSession(state.session, {
        type: 'saveStarted',
      });

      return {
        ...state,
        session,
        pendingSave: {
          target: { path: targetPath },
          content: state.content,
          contentVersion: state.session.contentVersion,
        },
        pendingSaveTargetKind: state.session.saveTargetKind ?? null,
        lastSaveError: null,
      };
    }
    case 'saveSettled':
      if (!state.pendingSave) {
        if (event.result.ok && event.result.contentVersion !== undefined) {
          return {
            ...state,
            session: reduceSingleDocumentSession(state.session, {
              type: 'saveSucceeded',
              savedVersion: event.result.contentVersion,
            }),
            lastSaveError: null,
          };
        }
        return state;
      }

      return {
        ...state,
        session: reduceSingleDocumentSession(state.session, {
          ...(event.result.ok
            ? {
                type: 'saveSucceeded' as const,
                savedVersion:
                  event.result.contentVersion ??
                  state.pendingSave.contentVersion,
              }
            : { type: 'saveFailed' as const }),
        }),
        pendingSave: null,
        pendingSaveTargetKind: null,
        lastSaveError: event.result.ok ? null : event.result.error,
      };
    case 'closeDocument':
      return {
        session: reduceSingleDocumentSession(state.session, {
          type: 'closed',
        }),
        content: '',
        pendingSave: null,
        pendingSaveTargetKind: null,
        lastSaveError: null,
      };
  }
};
