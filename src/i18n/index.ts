import { MESSAGES, type AppLocale } from './messages';

const DEFAULT_LOCALE: AppLocale = 'zh-CN';
let currentLocale: AppLocale = DEFAULT_LOCALE;

const normalizeLocale = (value: string | null | undefined): AppLocale => {
  if (!value) return DEFAULT_LOCALE;
  const lower = value.toLowerCase();
  if (lower.startsWith('zh')) return 'zh-CN';
  return 'en-US';
};

export const initLocale = (): AppLocale => {
  const locale =
    typeof navigator !== 'undefined' ? normalizeLocale(navigator.language) : DEFAULT_LOCALE;
  currentLocale = locale;
  return locale;
};

export const setLocale = (locale: AppLocale): void => {
  currentLocale = locale;
};

export const getLocale = (): AppLocale => currentLocale;

export const t = (key: string): string =>
  MESSAGES[currentLocale][key] ?? MESSAGES['en-US'][key] ?? key;
