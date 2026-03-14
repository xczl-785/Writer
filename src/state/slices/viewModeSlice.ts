import { create } from 'zustand';

export interface ViewModeState {
  isZen: boolean;
  isFocusZen: boolean;
  isTypewriterActive: boolean;
  typewriterRestoreSnapshot: boolean | null;
}

export type ViewModeKind = 'normal' | 'zen' | 'focus-zen';

export interface ViewModeActions {
  enterZen: (userTypewriterPreference: boolean) => void;
  exitZen: () => void;
  setFocusZen: (enabled: boolean) => void;
  syncTypewriterFromUserPreference: (enabledByUser: boolean) => void;
}

export function getViewModeKind(
  state: Pick<ViewModeState, 'isZen' | 'isFocusZen'>,
): ViewModeKind {
  if (state.isFocusZen) {
    return 'focus-zen';
  }
  if (state.isZen) {
    return 'zen';
  }
  return 'normal';
}

export function isZenPresentationActive(
  state: Pick<ViewModeState, 'isZen' | 'isFocusZen'>,
): boolean {
  return getViewModeKind(state) !== 'normal';
}

export const useViewModeStore = create<ViewModeState & ViewModeActions>(
  (set) => ({
    isZen: false,
    isFocusZen: false,
    isTypewriterActive: false,
    typewriterRestoreSnapshot: null,

    enterZen: (userTypewriterPreference) =>
      set((state) => {
        if (state.isZen) {
          return state;
        }
        return {
          isZen: true,
          isFocusZen: false,
          isTypewriterActive: true,
          typewriterRestoreSnapshot: userTypewriterPreference,
        };
      }),

    exitZen: () =>
      set((state) => ({
        isZen: false,
        isFocusZen: false,
        isTypewriterActive: state.typewriterRestoreSnapshot ?? false,
        typewriterRestoreSnapshot: null,
      })),

    setFocusZen: (enabled) =>
      set((state) =>
        state.isFocusZen === enabled ? state : { isFocusZen: enabled },
      ),

    syncTypewriterFromUserPreference: (enabledByUser) =>
      set((state) => {
        if (state.isZen) {
          return state;
        }
        if (state.isTypewriterActive === enabledByUser) {
          return state;
        }
        return { isTypewriterActive: enabledByUser };
      }),
  }),
);
