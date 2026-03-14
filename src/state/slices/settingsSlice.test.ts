import { beforeEach, describe, expect, it, vi } from 'vitest';

const LEGACY_LOCALE_KEY = 'writer.locale.preference';
const SETTINGS_STORAGE_KEY = 'writer.settings.v1';

const loadStore = async () => import('../../domains/settings/state/settingsStore');

describe('settingsSlice', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  it('hydrates with defaults when no stored data exists', async () => {
    const { useSettingsStore } = await loadStore();

    const state = useSettingsStore.getState();
    expect(state.localePreference).toBe('system');
    expect(state.typewriterEnabledByUser).toBe(false);
    expect(state.focusZenEnabledByUser).toBe(false);
  });

  it('migrates locale preference from legacy key on first load', async () => {
    window.localStorage.setItem(LEGACY_LOCALE_KEY, 'en-US');

    const { useSettingsStore } = await loadStore();
    const state = useSettingsStore.getState();

    expect(state.localePreference).toBe('en-US');
    const persisted = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    expect(persisted).toContain('"localePreference":"en-US"');
  });

  it('persists user settings updates', async () => {
    const { useSettingsStore } = await loadStore();
    useSettingsStore.getState().setTypewriterEnabledByUser(true);
    useSettingsStore.getState().setFocusZenEnabledByUser(true);

    const persisted = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    expect(persisted).toContain('"typewriterEnabledByUser":true');
    expect(persisted).toContain('"focusZenEnabledByUser":true');
  });
});
