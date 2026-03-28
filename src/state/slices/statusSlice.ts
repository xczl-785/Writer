import { create } from 'zustand';

export type AppStatus = 'idle' | 'loading' | 'saving' | 'error';
export type SaveStatus = 'saved' | 'dirty' | 'saving' | 'error';
export type SaveErrorCategory = 'user' | 'system' | 'network' | 'permission';

export interface SaveErrorAction {
  label: string;
  run: () => void;
}

export interface SaveErrorDetails {
  category?: SaveErrorCategory;
  reason: string;
  suggestion: string;
  action?: SaveErrorAction;
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
  markSaveFailed: (message?: string | null) => void;
  setSaveError: (
    reason: string,
    suggestion: string,
    options?: {
      category?: SaveErrorCategory;
      action?: SaveErrorAction;
    },
  ) => void;
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

  markSaveFailed: (message = null) =>
    set((state) => ({
      ...state,
      status: 'error',
      message,
      saveStatus: 'error',
      saveError: null,
    })),

  setSaveError: (reason, suggestion, options) =>
    set((state) => ({
      ...state,
      status: 'error',
      message: reason,
      saveStatus: 'error',
      saveError: {
        category: options?.category ?? 'system',
        reason,
        suggestion,
        action: options?.action,
      },
    })),
}));
