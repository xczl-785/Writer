import { MESSAGES, type AppLocale } from './messages';

const DEFAULT_LOCALE: AppLocale = 'zh-CN';
const LOCALE_PREFERENCE_KEY = 'writer.locale.preference';

export type LocalePreference = 'system' | AppLocale;

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

const loadLocalePreference = (): LocalePreference => {
  if (typeof window === 'undefined') {
    return 'system';
  }
  const stored = window.localStorage.getItem(LOCALE_PREFERENCE_KEY);
  if (stored === 'zh-CN' || stored === 'en-US') {
    return stored;
  }
  return 'system';
};

const persistLocalePreference = (preference: LocalePreference): void => {
  if (typeof window === 'undefined') {
    return;
  }
  if (preference === 'system') {
    window.localStorage.removeItem(LOCALE_PREFERENCE_KEY);
    return;
  }
  window.localStorage.setItem(LOCALE_PREFERENCE_KEY, preference);
};

export const initLocale = (): AppLocale => {
  localePreference = loadLocalePreference();
  currentLocale = applyLocalePreference(localePreference);
  return currentLocale;
};

export const setLocale = (locale: AppLocale): void => {
  localePreference = locale;
  currentLocale = locale;
  persistLocalePreference(localePreference);
};

export const getLocale = (): AppLocale => currentLocale;

export const setLocalePreference = (preference: LocalePreference): void => {
  localePreference = preference;
  currentLocale = applyLocalePreference(preference);
  persistLocalePreference(preference);
};

export const getLocalePreference = (): LocalePreference => localePreference;

export const t = (key: string): string =>
  MESSAGES[currentLocale][key] ?? MESSAGES['en-US'][key] ?? key;
