import { useMemo, useState } from 'react';
import { t, type LocalePreference } from '../../../i18n';
import { useSettingsStore } from '../../../state/slices/settingsSlice';

export type SettingsPanelProps = {
  isOpen: boolean;
  viewportTier?: 'min' | 'default' | 'airy';
  localePreference: LocalePreference;
  onLocalePreferenceChange: (value: LocalePreference) => void;
  onClose: () => void;
};

type SettingsTabId = 'general' | 'appearance' | 'editor' | 'shortcuts';
type SettingItemMode = 'active' | 'coming-soon' | 'disabled';

type SettingsTab = {
  id: SettingsTabId;
  label: string;
  title: string;
  implemented: boolean;
};

type SettingRowBase = {
  id: string;
  label: string;
  description: string;
  mode: SettingItemMode;
};

type SelectSettingRow = SettingRowBase & {
  kind: 'select';
  value: LocalePreference;
  onChange: (value: LocalePreference) => void;
};

type ToggleSettingRow = SettingRowBase & {
  kind: 'toggle';
  checked: boolean;
  onToggle?: () => void;
};

type SettingRow = SelectSettingRow | ToggleSettingRow;

export function SettingsPanel({
  isOpen,
  viewportTier = 'default',
  localePreference,
  onLocalePreferenceChange,
  onClose,
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>('general');
  const typewriterEnabledByUser = useSettingsStore(
    (state) => state.typewriterEnabledByUser,
  );
  const focusZenEnabledByUser = useSettingsStore(
    (state) => state.focusZenEnabledByUser,
  );
  const setTypewriterEnabledByUser = useSettingsStore(
    (state) => state.setTypewriterEnabledByUser,
  );
  const setFocusZenEnabledByUser = useSettingsStore(
    (state) => state.setFocusZenEnabledByUser,
  );

  const tabs: SettingsTab[] = [
    {
      id: 'general',
      label: t('settings.tab.general'),
      title: t('settings.title.general'),
      implemented: true,
    },
    {
      id: 'appearance',
      label: t('settings.tab.appearance'),
      title: t('settings.title.appearance'),
      implemented: false,
    },
    {
      id: 'editor',
      label: t('settings.tab.editor'),
      title: t('settings.title.editor'),
      implemented: true,
    },
    {
      id: 'shortcuts',
      label: t('settings.tab.shortcuts'),
      title: t('settings.title.shortcuts'),
      implemented: false,
    },
  ];
  const currentTab = tabs.find((item) => item.id === activeTab) ?? tabs[0];

  const generalRows: SettingRow[] = useMemo(
    () => [
      {
        kind: 'select',
        id: 'language',
        label: t('settings.general.language.label'),
        description: t('settings.general.language.desc'),
        mode: 'active',
        value: localePreference,
        onChange: (value) => onLocalePreferenceChange(value),
      },
      {
        kind: 'toggle',
        id: 'resume-session',
        label: t('settings.general.resumeSession.label'),
        description: t('settings.general.resumeSession.desc'),
        mode: 'coming-soon',
        checked: false,
      },
      {
        kind: 'toggle',
        id: 'autosave',
        label: t('settings.general.autosave.label'),
        description: t('settings.general.autosave.desc'),
        mode: 'coming-soon',
        checked: true,
      },
    ],
    [localePreference, onLocalePreferenceChange],
  );

  const renderBadge = (mode: SettingItemMode) => {
    if (mode !== 'coming-soon') return null;
    return (
      <span className="settings-item__badge">{t('settings.badge.comingSoon')}</span>
    );
  };

  const renderRowControl = (row: SettingRow) => {
    if (row.kind === 'select') {
      return (
        <div className="settings-item__control settings-item__control--select">
          <select
            value={row.value}
            className="settings-select"
            onChange={(event) =>
              row.onChange(event.target.value as LocalePreference)
            }
          >
            <option value="system">{t('settings.language.system')}</option>
            <option value="zh-CN">{t('settings.language.zhCN')}</option>
            <option value="en-US">{t('settings.language.enUS')}</option>
          </select>
          <span className="settings-select__arrow" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 9L12 15L18 9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
      );
    }

    if (row.kind === 'toggle') {
      return (
        <button
          type="button"
          className={`settings-toggle ${
            row.checked ? 'settings-toggle--on' : 'settings-toggle--off'
          }`}
          onClick={row.onToggle}
          disabled={row.mode !== 'active'}
          aria-disabled={row.mode !== 'active' ? 'true' : 'false'}
          aria-pressed={row.checked}
        >
          <span className="settings-toggle__dot" />
        </button>
      );
    }

    return null;
  };

  if (!isOpen) return null;
  const editorRows: SettingRow[] = [
    {
      kind: 'toggle',
      id: 'typewriter-mode',
      label: t('settings.editor.typewriter.label'),
      description: t('settings.editor.typewriter.desc'),
      mode: 'active',
      checked: typewriterEnabledByUser,
      onToggle: () => setTypewriterEnabledByUser(!typewriterEnabledByUser),
    },
    {
      kind: 'toggle',
      id: 'focus-zen-mode',
      label: t('settings.editor.focusZen.label'),
      description: t('settings.editor.focusZen.desc'),
      mode: 'active',
      checked: focusZenEnabledByUser,
      onToggle: () => setFocusZenEnabledByUser(!focusZenEnabledByUser),
    },
  ];
  const activeRows =
    currentTab.id === 'general'
      ? generalRows
      : currentTab.id === 'editor'
        ? editorRows
        : null;

  return (
    <div
      className="settings-overlay"
      data-viewport-tier={viewportTier}
      role="dialog"
      aria-label={t('settings.title')}
    >
      <div className="settings-dialog">
        <aside className="settings-sidebar">
          <div className="settings-sidebar__header">{t('settings.title')}</div>
          <nav className="settings-sidebar__tabs" aria-label={t('settings.title')}>
            {tabs.map((tab) => {
              const isActive = tab.id === currentTab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`settings-tab ${isActive ? 'is-active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="settings-tab__indicator" />
                  <span className="settings-tab__label">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="settings-main">
          <div className="settings-main__header">
            <h2 className="settings-main__title">{currentTab.title}</h2>
            <button
              type="button"
              className="settings-main__close"
              onClick={onClose}
              aria-label={t('settings.close')}
              title={t('settings.close')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 18L18 6M6 6L18 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          <div className="settings-main__content">
            {currentTab.implemented && activeRows ? (
              <div className="settings-section">
                {activeRows.map((row) => (
                  <div
                    key={row.id}
                    className={`settings-item ${
                      row.mode === 'active' ? 'is-active' : 'is-disabled'
                    }`}
                  >
                    <div className="settings-item__text">
                      <div className="settings-item__label-line">
                        <span className="settings-item__label">{row.label}</span>
                        {renderBadge(row.mode)}
                      </div>
                      <div className="settings-item__desc">{row.description}</div>
                    </div>
                    {renderRowControl(row)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="settings-placeholder">
                <div className="settings-placeholder__icon">
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M7 8V6a2 2 0 012-2h6a2 2 0 012 2v2M5 8h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8a2 2 0 012-2z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h3 className="settings-placeholder__title">
                  {t('settings.placeholder.title')}
                </h3>
                <p className="settings-placeholder__desc">
                  {t('settings.placeholder.desc')}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
