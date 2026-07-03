export type SingleDocumentSessionStatus =
  | 'empty'
  | 'open'
  | 'dirty'
  | 'saving'
  | 'closed';

export interface SingleDocumentSessionState {
  documentPath: string | null;
  status: SingleDocumentSessionStatus;
  contentVersion: number;
  savedVersion: number;
}

export type SingleDocumentSessionEvent =
  | { type: 'opened'; path: string; contentVersion?: number }
  | { type: 'edited' }
  | { type: 'saveStarted' }
  | { type: 'saveSucceeded' }
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
        status: 'open',
        contentVersion,
        savedVersion: contentVersion,
      };
    }
    case 'edited':
      if (!state.documentPath || state.status === 'closed') {
        return state;
      }
      return {
        ...state,
        status: 'dirty',
        contentVersion: state.contentVersion + 1,
      };
    case 'saveStarted':
      return state.status === 'dirty' ? { ...state, status: 'saving' } : state;
    case 'saveSucceeded':
      return state.status === 'saving'
        ? {
            ...state,
            status: 'open',
            savedVersion: state.contentVersion,
          }
        : state;
    case 'saveFailed':
      return state.status === 'saving' ? { ...state, status: 'dirty' } : state;
    case 'closed':
      return {
        ...state,
        status: 'closed',
        documentPath: null,
      };
  }
};

export const isSingleDocumentSessionDirty = (
  state: SingleDocumentSessionState,
): boolean => state.contentVersion !== state.savedVersion;
