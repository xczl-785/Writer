import { create } from 'zustand';

export type AppStatus = 'idle' | 'loading' | 'saving' | 'error';

export interface StatusState {
  status: AppStatus;
  message: string | null;
}

export interface StatusActions {
  setStatus: (status: AppStatus, message?: string | null) => void;
}

export const useStatusStore = create<StatusState & StatusActions>((set) => ({
  status: 'idle',
  message: null,

  setStatus: (status, message = null) => set({ status, message }),
}));
