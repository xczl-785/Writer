import { create } from 'zustand';

export type AppStatus = 'idle' | 'loading' | 'saving' | 'error';
export type SaveStatus = 'saved' | 'dirty' | 'saving' | 'error';

export interface SaveErrorDetails {
  reason: string;
  suggestion: string;
}

export interface StatusState {
  status: AppStatus;
  message: string | null;
  saveStatus: SaveStatus;
  lastSavedAt: number | null;
  saveError: SaveErrorDetails | null;
}

export interface StatusActions {
  setStatus: (status: AppStatus, message?: string | null) => void;
  markDirty: () => void;
  markSaving: (path: string) => void;
  markSaved: (message?: string) => void;
  setSaveError: (reason: string, suggestion: string) => void;
}

export const useStatusStore = create<StatusState & StatusActions>((set) => ({
  status: 'idle',
  message: null,
  saveStatus: 'saved',
  lastSavedAt: null,
  saveError: null,

  setStatus: (status, message = null) => set({ status, message }),

  markDirty: () =>
    set((state) =>
      state.saveStatus === 'dirty'
        ? state
        : {
            ...state,
            saveStatus: 'dirty',
            saveError: null,
          },
    ),

  markSaving: (path) =>
    set((state) => ({
      ...state,
      saveStatus: 'saving',
      message: `Saving ${path}...`,
    })),

  markSaved: (message = 'Saved') =>
    set((state) => ({
      ...state,
      status: 'idle',
      message,
      saveStatus: 'saved',
      saveError: null,
      lastSavedAt: Date.now(),
    })),

  setSaveError: (reason, suggestion) =>
    set((state) => ({
      ...state,
      status: 'error',
      message: reason,
      saveStatus: 'error',
      saveError: {
        reason,
        suggestion,
      },
    })),
}));
