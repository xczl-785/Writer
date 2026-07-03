import type { SaveInput, SaveResult } from '../save/saveTypes';
import {
  createEmptySingleDocumentSession,
  isSingleDocumentSessionDirty,
  reduceSingleDocumentSession,
  type SingleDocumentSessionState,
  type SingleDocumentSessionStatus,
} from './singleDocumentSession';

export interface SingleDocumentSessionShellState {
  session: SingleDocumentSessionState;
  content: string;
  pendingSave: SaveInput | null;
}

export type SingleDocumentSessionShellEvent =
  | {
      type: 'openDocument';
      path: string;
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
  pendingSave: SaveInput | null;
}

export const createSingleDocumentSessionShellState =
  (): SingleDocumentSessionShellState => ({
    session: createEmptySingleDocumentSession(),
    content: '',
    pendingSave: null,
  });

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
      };
    case 'editDocument':
      return {
        ...state,
        session: reduceSingleDocumentSession(state.session, {
          type: 'edited',
        }),
        content: event.content,
      };
    case 'requestSave': {
      if (
        state.session.documentPath === null ||
        state.session.status !== 'dirty'
      ) {
        return state;
      }

      const session = reduceSingleDocumentSession(state.session, {
        type: 'saveStarted',
      });

      return {
        ...state,
        session,
        pendingSave: {
          target: { path: state.session.documentPath },
          content: state.content,
        },
      };
    }
    case 'saveSettled':
      if (!state.pendingSave) {
        return state;
      }

      return {
        ...state,
        session: reduceSingleDocumentSession(state.session, {
          type: event.result.ok ? 'saveSucceeded' : 'saveFailed',
        }),
        pendingSave: null,
      };
    case 'closeDocument':
      return {
        session: reduceSingleDocumentSession(state.session, {
          type: 'closed',
        }),
        content: '',
        pendingSave: null,
      };
  }
};
