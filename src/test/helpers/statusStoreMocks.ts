import { vi } from 'vitest';

export function createStatusState(setStatus = vi.fn()) {
  return {
    status: 'idle' as const,
    message: null as string | null,
    saveStatus: 'saved' as const,
    lastSavedAt: null as number | null,
    saveError: null as { reason: string; suggestion: string } | null,
    setStatus,
    markDirty: vi.fn(),
    markSaving: vi.fn(),
    markSaved: vi.fn(),
    markSaveFailed: vi.fn(),
    setSaveError: vi.fn(),
  };
}
