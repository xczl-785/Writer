import { useEffect, useState } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { t } from '../../../shared/i18n';
import {
  checkForAppUpdate,
  installAppUpdate,
  openReleasePage,
  type AvailableAppUpdate,
} from './aboutUpdater';

export type AboutWriterPanelProps = {
  isOpen: boolean;
  viewportTier?: 'min' | 'default' | 'airy';
  onClose: () => void;
};

type UpdateState =
  | { phase: 'idle' }
  | { phase: 'checking' }
  | { phase: 'upToDate' }
  | { phase: 'available'; update: AvailableAppUpdate }
  | { phase: 'downloading'; update: AvailableAppUpdate; percent: number | null }
  | { phase: 'installing'; update: AvailableAppUpdate; percent: number | null }
  | { phase: 'error'; message: string };

function detectDesktopPlatform():
  | 'Windows Desktop'
  | 'macOS Desktop'
  | 'Linux Desktop' {
  if (typeof navigator === 'undefined') {
    return 'Windows Desktop';
  }

  const userAgentData = (
    navigator as Navigator & { userAgentData?: { platform?: string } }
  ).userAgentData;
  const userAgent =
    `${userAgentData?.platform ?? ''} ${navigator.userAgent}`.toLowerCase();

  if (userAgent.includes('mac')) {
    return 'macOS Desktop';
  }

  if (userAgent.includes('win')) {
    return 'Windows Desktop';
  }

  return 'Linux Desktop';
}

export function AboutWriterPanel({
  isOpen,
  viewportTier = 'default',
  onClose,
}: AboutWriterPanelProps) {
  const [version, setVersion] = useState<string>('...');
  const [updateState, setUpdateState] = useState<UpdateState>({
    phase: 'idle',
  });

  useEffect(() => {
    getVersion()
      .then(setVersion)
      .catch(() => setVersion('dev'));
  }, []);

  const handleCheckForUpdates = async () => {
    setUpdateState({ phase: 'checking' });

    try {
      const result = await checkForAppUpdate();
      if (result.kind === 'none') {
        setUpdateState({ phase: 'upToDate' });
        return;
      }

      setUpdateState({ phase: 'available', update: result });
    } catch {
      setUpdateState({
        phase: 'error',
        message: t('aboutWriter.updates.error'),
      });
    }
  };

  const handleInstallUpdate = async (appUpdate: AvailableAppUpdate) => {
    setUpdateState({ phase: 'downloading', update: appUpdate, percent: 0 });

    try {
      await installAppUpdate(appUpdate, ({ phase, percent }) => {
        if (phase === 'downloading') {
          setUpdateState({
            phase: 'downloading',
            update: appUpdate,
            percent,
          });
          return;
        }

        setUpdateState({
          phase: 'installing',
          update: appUpdate,
          percent,
        });
      });
    } catch {
      setUpdateState({
        phase: 'error',
        message: t('aboutWriter.updates.installError'),
      });
    }
  };

  if (!isOpen) {
    return null;
  }

  const currentVersionText = t('aboutWriter.currentVersion').replace(
    '{version}',
    version,
  );
  const desktopPlatform = detectDesktopPlatform();
  const footerTag = `About Writer - ${desktopPlatform.replace(' Desktop', '')}`;
  const isBusy =
    updateState.phase === 'checking' ||
    updateState.phase === 'downloading' ||
    updateState.phase === 'installing';

  const renderUpdateSummary = () => {
    if (updateState.phase === 'checking') {
      return (
        <p className="about-writer-update-card__status">
          {t('aboutWriter.updates.checking')}
        </p>
      );
    }

    if (updateState.phase === 'upToDate') {
      return (
        <p className="about-writer-update-card__status">
          {t('aboutWriter.updates.upToDate')}
        </p>
      );
    }

    if (updateState.phase === 'error') {
      return (
        <div className="about-writer-update-card__feedback">
          <p className="about-writer-update-card__status">
            {updateState.message}
          </p>
          <button
            type="button"
            className="about-writer-secondary-action"
            onClick={() => openReleasePage()}
          >
            {t('aboutWriter.updates.openReleasePage')}
          </button>
        </div>
      );
    }

    if (
      updateState.phase === 'available' ||
      updateState.phase === 'downloading' ||
      updateState.phase === 'installing'
    ) {
      const { update } = updateState;
      const statusText =
        updateState.phase === 'installing'
          ? t('aboutWriter.updates.installing')
          : updateState.phase === 'downloading'
            ? t('aboutWriter.updates.downloading')
            : t('aboutWriter.updates.availableVersion').replace(
                '{version}',
                update.version,
              );

      return (
        <div className="about-writer-update-card__feedback">
          <p className="about-writer-update-card__status">{statusText}</p>
          {update.notes ? (
            <p className="about-writer-update-card__notes">{update.notes}</p>
          ) : null}
          {update.publishedAt ? (
            <p className="about-writer-update-card__meta">
              {t('aboutWriter.updates.publishedAt').replace(
                '{date}',
                new Date(update.publishedAt).toLocaleDateString(),
              )}
            </p>
          ) : null}
          {updateState.phase === 'downloading' ||
          updateState.phase === 'installing' ? (
            <div className="about-writer-update-progress">
              <div
                className="about-writer-update-progress__bar"
                style={{ width: `${updateState.percent ?? 100}%` }}
              />
              <span className="about-writer-update-progress__label">
                {updateState.percent ?? 100}%
              </span>
            </div>
          ) : null}
          {updateState.phase === 'available' ? (
            <div className="about-writer-update-card__actions">
              <button
                type="button"
                className="about-writer-primary-action"
                onClick={() => void handleInstallUpdate(update)}
              >
                {t('aboutWriter.updates.updateNow')}
              </button>
              <button
                type="button"
                className="about-writer-secondary-action"
                onClick={() => openReleasePage(update.releaseUrl)}
              >
                {t('aboutWriter.updates.openReleasePage')}
              </button>
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <p className="about-writer-update-card__status">
        {t('aboutWriter.updates.idle')}
      </p>
    );
  };

  return (
    <div
      className="about-writer-overlay"
      data-viewport-tier={viewportTier}
      role="dialog"
      aria-label={t('aboutWriter.title')}
    >
      <div className="about-writer-backdrop" onClick={onClose} />
      <div className="about-writer-dialog">
        <div className="about-writer-hero">
          <div className="about-writer-hero__main">
            <div className="about-writer-hero__icon-frame">
              <img
                src="/icon.svg"
                alt={t('aboutWriter.iconAlt')}
                className="about-writer-hero__icon"
              />
            </div>
            <div className="about-writer-hero__copy">
              <h2 className="about-writer-hero__title">
                {t('aboutWriter.title')}
              </h2>
              <p className="about-writer-hero__subtitle">
                {t('aboutWriter.subtitle')}
              </p>
              <div className="about-writer-version-pill">
                <span
                  className="about-writer-version-pill__dot"
                  aria-hidden="true"
                />
                <span>{currentVersionText}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="about-writer-close"
            onClick={onClose}
            aria-label={t('aboutWriter.close')}
            title={t('aboutWriter.close')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
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

        <div className="about-writer-content">
          <div className="about-writer-grid">
            <section className="about-writer-card">
              <div className="about-writer-card__eyebrow">
                {t('aboutWriter.buildInfo')}
              </div>
              <div className="about-writer-card__list">
                <div>
                  <span>{t('aboutWriter.versionLabel')}</span>
                  <strong>{version}</strong>
                </div>
                <div>
                  <span>{t('aboutWriter.platformLabel')}</span>
                  <strong>{desktopPlatform}</strong>
                </div>
                <div>
                  <span>{t('aboutWriter.stackLabel')}</span>
                  <strong>{t('aboutWriter.stackValue')}</strong>
                </div>
              </div>
            </section>
            <section className="about-writer-card">
              <div className="about-writer-card__eyebrow">
                {t('aboutWriter.positioningTitle')}
              </div>
              <p className="about-writer-card__description">
                {t('aboutWriter.positioningBody')}
              </p>
            </section>
          </div>

          <section className="about-writer-update-card">
            <div className="about-writer-links__eyebrow">
              {t('aboutWriter.updates.title')}
            </div>
            <div className="about-writer-update-card__header">
              <div>
                <div className="about-writer-update-card__title">
                  {t('aboutWriter.updates.cardTitle')}
                </div>
                <div className="about-writer-update-card__desc">
                  {t('aboutWriter.updates.cardDesc')}
                </div>
              </div>
              <button
                type="button"
                className="about-writer-primary-action"
                onClick={() => void handleCheckForUpdates()}
                disabled={isBusy}
              >
                {updateState.phase === 'checking'
                  ? t('aboutWriter.updates.checking')
                  : t('aboutWriter.updates.checkButton')}
              </button>
            </div>
            {renderUpdateSummary()}
          </section>

          <section className="about-writer-links">
            <div className="about-writer-links__eyebrow">
              {t('aboutWriter.more')}
            </div>
            <div className="about-writer-link-card">
              <div>
                <div className="about-writer-link-card__title">
                  {t('aboutWriter.releaseNotes.title')}
                </div>
                <div className="about-writer-link-card__desc">
                  {t('aboutWriter.releaseNotes.desc')}
                </div>
              </div>
              <div className="about-writer-link-card__meta">
                {t('aboutWriter.comingSoon')}
              </div>
            </div>
            <div className="about-writer-link-card">
              <div>
                <div className="about-writer-link-card__title">
                  {t('aboutWriter.documentation.title')}
                </div>
                <div className="about-writer-link-card__desc">
                  {t('aboutWriter.documentation.desc')}
                </div>
              </div>
              <div className="about-writer-link-card__meta">
                {t('aboutWriter.comingSoon')}
              </div>
            </div>
          </section>
        </div>

        <div className="about-writer-footer">
          <span>© 2026 Writer</span>
          <span>{footerTag}</span>
        </div>
      </div>
    </div>
  );
}
