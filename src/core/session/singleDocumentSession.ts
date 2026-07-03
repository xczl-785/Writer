export type SingleDocumentSessionStatus =
  | 'empty'
  | 'open'
  | 'dirty'
  | 'saving'
  | 'closed';

export type SaveTargetKind = 'recovery' | 'file';

export type DocumentKind = 'temporary' | 'file' | 'empty' | 'closed';

export interface SingleDocumentSessionState {
  documentPath: string | null;
  sourcePath?: string | null;
  recoveryPath?: string | null;
  saveTargetKind?: SaveTargetKind | null;
  status: SingleDocumentSessionStatus;
  contentVersion: number;
  savedVersion: number;
}

export type SingleDocumentSessionEvent =
  | { type: 'opened'; path: string; contentVersion?: number }
  | {
      type: 'openedFile';
      path: string;
      contentVersion?: number;
    }
  | {
      type: 'openedTemporary';
      recoveryPath: string;
      contentVersion?: number;
    }
  | { type: 'edited' }
  | { type: 'saveStarted' }
  | { type: 'saveSucceeded'; savedVersion: number }
  | { type: 'saveFailed' }
  | { type: 'closed' };

export const createEmptySingleDocumentSession =
  (): SingleDocumentSessionState => ({
    documentPath: null,
    status: 'empty',
    contentVersion: 0,
    savedVersion: 0,
  });

export const reduceSingleDocumentSession = (
  state: SingleDocumentSessionState,
  event: SingleDocumentSessionEvent,
): SingleDocumentSessionState => {
  switch (event.type) {
    case 'opened': {
      const contentVersion = event.contentVersion ?? 0;
      return {
        documentPath: event.path,
        sourcePath: event.path,
        recoveryPath: null,
        saveTargetKind: 'file',
        status: 'open',
        contentVersion,
        savedVersion: contentVersion,
      };
    }
    case 'openedFile': {
      const contentVersion = event.contentVersion ?? 0;
      return {
        documentPath: event.path,
        sourcePath: event.path,
        recoveryPath: null,
        saveTargetKind: 'file',
        status: 'open',
        contentVersion,
        savedVersion: contentVersion,
      };
    }
    case 'openedTemporary': {
      const contentVersion = event.contentVersion ?? 0;
      return {
        documentPath: null,
        sourcePath: null,
        recoveryPath: event.recoveryPath,
        saveTargetKind: 'recovery',
        status: 'open',
        contentVersion,
        savedVersion: contentVersion,
      };
    }
    case 'edited':
      if (
        (!state.documentPath && !state.recoveryPath) ||
        state.status === 'closed'
      ) {
        return state;
      }
      return {
        ...state,
        status: 'dirty',
        contentVersion: state.contentVersion + 1,
      };
    case 'saveStarted':
      return state.status === 'dirty' ? { ...state, status: 'saving' } : state;
    case 'saveSucceeded': {
      if (state.status === 'closed' || state.status === 'empty') {
        return state;
      }

      const savedVersion = Math.min(
        state.contentVersion,
        Math.max(state.savedVersion, event.savedVersion),
      );
      return {
        ...state,
        status: savedVersion === state.contentVersion ? 'open' : 'dirty',
        savedVersion,
      };
    }
    case 'saveFailed':
      return state.status === 'saving' || state.status === 'dirty'
        ? { ...state, status: 'dirty' }
        : state;
    case 'closed':
      return {
        ...state,
        status: 'closed',
        documentPath: null,
        sourcePath: null,
        recoveryPath: null,
        saveTargetKind: null,
      };
  }
};

export const isSingleDocumentSessionDirty = (
  state: SingleDocumentSessionState,
): boolean => state.contentVersion !== state.savedVersion;
