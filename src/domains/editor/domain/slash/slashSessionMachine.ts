/**
 * Slash Menu Session State Machine
 *
 * Pure state machine for managing slash menu sessions.
 * All state transitions are pure functions, making them easily testable.
 */

export type SlashPhase = 'idle' | 'open' | 'searching' | 'executing';

export type AnchorRect = {
  left: number;
  top: number;
  bottom: number;
};

export type SlashSession = {
  phase: SlashPhase;
  query: string;
  selectedIndex: number;
  anchorRect: AnchorRect | null;
  source: 'keyboard' | 'ime';
};

export type SlashAction =
  | { type: 'OPEN'; anchorRect: AnchorRect; source: 'keyboard' | 'ime' }
  | { type: 'APPEND_QUERY'; char: string }
  | { type: 'DELETE_QUERY' }
  | { type: 'SET_SELECTED'; index: number; itemCount: number }
  | { type: 'MOVE_NEXT'; itemCount: number }
  | { type: 'MOVE_PREV'; itemCount: number }
  | { type: 'SUBMIT' }
  | { type: 'CLOSE' };

export const createInitialSlashSession = (): SlashSession => ({
  phase: 'idle',
  query: '',
  selectedIndex: 0,
  anchorRect: null,
  source: 'keyboard',
});

export function slashReducer(
  state: SlashSession,
  action: SlashAction,
): SlashSession {
  switch (action.type) {
    case 'OPEN':
      return {
        phase: 'open',
        query: '',
        selectedIndex: 0,
        anchorRect: action.anchorRect,
        source: action.source,
      };

    case 'APPEND_QUERY':
      if (state.phase === 'idle') return state;
      return {
        ...state,
        phase: 'searching',
        query: `${state.query}${action.char}`,
        selectedIndex: 0,
      };

    case 'DELETE_QUERY':
      if (state.phase === 'idle') return state;
      if (state.query.length === 0) {
        return createInitialSlashSession();
      }
      {
        const nextQuery = state.query.slice(0, -1);
        return {
          ...state,
          query: nextQuery,
          phase: nextQuery.length > 0 ? 'searching' : 'open',
          selectedIndex: 0,
        };
      }

    case 'SET_SELECTED':
      if (state.phase === 'idle' || action.itemCount === 0) return state;
      return {
        ...state,
        selectedIndex: Math.min(
          Math.max(action.index, 0),
          action.itemCount - 1,
        ),
      };

    case 'MOVE_NEXT':
      if (state.phase === 'idle' || action.itemCount === 0) return state;
      return {
        ...state,
        selectedIndex: (state.selectedIndex + 1) % action.itemCount,
      };

    case 'MOVE_PREV':
      if (state.phase === 'idle' || action.itemCount === 0) return state;
      return {
        ...state,
        selectedIndex:
          (state.selectedIndex - 1 + action.itemCount) % action.itemCount,
      };

    case 'SUBMIT':
      if (state.phase === 'idle') return state;
      return {
        ...state,
        phase: 'executing',
      };

    case 'CLOSE':
      return createInitialSlashSession();

    default:
      return state;
  }
}

export function isOpenPhase(phase: SlashPhase): boolean {
  return phase === 'open' || phase === 'searching';
}

export function isActivePhase(phase: SlashPhase): boolean {
  return phase !== 'idle';
}
