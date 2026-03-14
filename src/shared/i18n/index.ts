import { MESSAGES, type AppLocale } from './messages';
import {
  useSettingsStore,
  type SettingsLocalePreference,
} from '../../domains/settings/state/settingsStore';

const DEFAULT_LOCALE: AppLocale = 'zh-CN';

export type LocalePreference = SettingsLocalePreference;

let currentLocale: AppLocale = DEFAULT_LOCALE;
let localePreference: LocalePreference = 'system';

const normalizeLocale = (value: string | null | undefined): AppLocale => {
  if (!value) return DEFAULT_LOCALE;
  const lower = value.toLowerCase();
  if (lower.startsWith('zh')) return 'zh-CN';
  return 'en-US';
};

const detectSystemLocale = (): AppLocale => {
  if (typeof navigator === 'undefined') {
    return DEFAULT_LOCALE;
  }
  return normalizeLocale(navigator.language);
};

const applyLocalePreference = (preference: LocalePreference): AppLocale => {
  return preference === 'system' ? detectSystemLocale() : preference;
};

export const initLocale = (): AppLocale => {
  localePreference = useSettingsStore.getState().localePreference;
  currentLocale = applyLocalePreference(localePreference);
  return currentLocale;
};

export const setLocale = (locale: AppLocale): void => {
  localePreference = locale;
  currentLocale = locale;
  useSettingsStore.getState().setLocalePreference(localePreference);
};

export const getLocale = (): AppLocale => currentLocale;

export const setLocalePreference = (preference: LocalePreference): void => {
  useSettingsStore.getState().setLocalePreference(preference);
  localePreference = useSettingsStore.getState().localePreference;
  currentLocale = applyLocalePreference(localePreference);
};

export const getLocalePreference = (): LocalePreference => localePreference;

export const t = (key: string): string =>
  MESSAGES[currentLocale][key] ?? MESSAGES['en-US'][key] ?? key;
