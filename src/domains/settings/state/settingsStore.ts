import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type SettingsLocalePreference = 'system' | 'zh-CN' | 'en-US';

export interface SettingsStorageAdapter {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

const noopAdapter: SettingsStorageAdapter = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

const webStorageAdapter: SettingsStorageAdapter = {
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
  removeItem: (key) => window.localStorage.removeItem(key),
};

const hasWindow = () => typeof window !== 'undefined';

const resolveAdapter = (): SettingsStorageAdapter =>
  hasWindow() ? webStorageAdapter : noopAdapter;

export const SETTINGS_STORAGE_KEY = 'writer.settings.v1';
export const LEGACY_LOCALE_PREFERENCE_KEY = 'writer.locale.preference';

export interface SettingsState {
  localePreference: SettingsLocalePreference;
  typewriterEnabledByUser: boolean;
  focusZenEnabledByUser: boolean;
}

export interface SettingsActions {
  setLocalePreference: (preference: SettingsLocalePreference) => void;
  setTypewriterEnabledByUser: (enabled: boolean) => void;
  setFocusZenEnabledByUser: (enabled: boolean) => void;
}

type PersistedSettings = SettingsState;

const DEFAULT_SETTINGS: SettingsState = {
  localePreference: 'system',
  typewriterEnabledByUser: false,
  focusZenEnabledByUser: false,
};

const normalizeLocalePreference = (
  value: string | null | undefined,
): SettingsLocalePreference => {
  if (value === 'zh-CN' || value === 'en-US' || value === 'system') {
    return value;
  }
  return 'system';
};

const readLegacyLocalePreference = (
  adapter: SettingsStorageAdapter,
): SettingsLocalePreference | null => {
  const legacy = adapter.getItem(LEGACY_LOCALE_PREFERENCE_KEY);
  if (!legacy) return null;
  return normalizeLocalePreference(legacy);
};

const migrateFromLegacyLocale = (
  state: PersistedSettings,
  adapter: SettingsStorageAdapter,
): PersistedSettings => {
  const legacy = readLegacyLocalePreference(adapter);
  if (!legacy || legacy === state.localePreference) {
    return state;
  }

  return { ...state, localePreference: legacy };
};

const storage = createJSONStorage<SettingsState>(() => resolveAdapter());

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      setLocalePreference: (preference) =>
        set({ localePreference: normalizeLocalePreference(preference) }),
      setTypewriterEnabledByUser: (enabled) =>
        set({ typewriterEnabledByUser: enabled }),
      setFocusZenEnabledByUser: (enabled) =>
        set({ focusZenEnabledByUser: enabled }),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      storage,
      partialize: (state) => ({
        localePreference: state.localePreference,
        typewriterEnabledByUser: state.typewriterEnabledByUser,
        focusZenEnabledByUser: state.focusZenEnabledByUser,
      }),
      merge: (persistedState, currentState) => {
        const adapter = resolveAdapter();
        const persisted = (persistedState as Partial<PersistedSettings>) ?? {};
        const normalizedLocale = normalizeLocalePreference(
          persisted.localePreference,
        );
        const mergedState: PersistedSettings = {
          localePreference: normalizedLocale,
          typewriterEnabledByUser:
            persisted.typewriterEnabledByUser ??
            currentState.typewriterEnabledByUser,
          focusZenEnabledByUser:
            persisted.focusZenEnabledByUser ??
            currentState.focusZenEnabledByUser,
        };

        const migrated = migrateFromLegacyLocale(mergedState, adapter);
        return {
          ...currentState,
          ...migrated,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const adapter = resolveAdapter();
        const hasPersistedSettings =
          adapter.getItem(SETTINGS_STORAGE_KEY) !== null;
        const legacy = readLegacyLocalePreference(adapter);
        if (!legacy) return;
        if (state.localePreference !== legacy || !hasPersistedSettings) {
          state.setLocalePreference(legacy);
        }
      },
      version: 1,
    },
  ),
);

/**
 * This adapter boundary keeps migration to Tauri store low-risk:
 * 1) read from old web storage keys;
 * 2) write to new backend;
 * 3) keep fallback window for rollback.
 */
export const settingsStorage = {
  resolveAdapter,
};
