import { t, type LocalePreference } from '../../../i18n';

export type SettingsPanelProps = {
  isOpen: boolean;
  localePreference: LocalePreference;
  onLocalePreferenceChange: (value: LocalePreference) => void;
  onClose: () => void;
};

export function SettingsPanel({
  isOpen,
  localePreference,
  onLocalePreferenceChange,
  onClose,
}: SettingsPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="settings-overlay" role="dialog" aria-label={t('settings.title')}>
      <div className="settings-panel">
        <div className="settings-panel__header">
          <h2 className="settings-panel__title">{t('settings.title')}</h2>
          <button
            type="button"
            className="settings-panel__close"
            onClick={onClose}
          >
            {t('settings.close')}
          </button>
        </div>
        <div className="settings-panel__body">
          <label className="settings-panel__label" htmlFor="settings-language">
            {t('settings.language')}
          </label>
          <select
            id="settings-language"
            className="settings-panel__select"
            value={localePreference}
            onChange={(event) =>
              onLocalePreferenceChange(event.target.value as LocalePreference)
            }
          >
            <option value="system">{t('settings.language.system')}</option>
            <option value="zh-CN">{t('settings.language.zhCN')}</option>
            <option value="en-US">{t('settings.language.enUS')}</option>
          </select>
        </div>
      </div>
    </div>
  );
}
