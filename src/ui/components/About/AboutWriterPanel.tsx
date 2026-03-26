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
  | { phase: 'downloading'; update: AvailableAppUpdate }
  | { phase: 'installing'; update: AvailableAppUpdate }
  | { phase: 'error'; reason: 'checkFailed' | 'installFailed' };

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

function formatUpdateVersion(version: string): string {
  return version.startsWith('v') ? version : `v${version}`;
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
        reason: 'checkFailed',
      });
    }
  };

  const handlePrimaryAction = async () => {
    if (updateState.phase === 'error') {
      openReleasePage();
      return;
    }

    if (updateState.phase === 'available') {
      const { update } = updateState;
      setUpdateState({ phase: 'downloading', update });

      try {
        await installAppUpdate(update, ({ phase }) => {
          setUpdateState({
            phase: phase === 'installing' ? 'installing' : 'downloading',
            update,
          });
        });
      } catch {
        setUpdateState({
          phase: 'error',
          reason: 'installFailed',
        });
      }

      return;
    }

    await handleCheckForUpdates();
  };

  if (!isOpen) {
    return null;
  }

  const currentVersionText = t('aboutWriter.currentVersion').replace(
    '{version}',
    version,
  );
  const desktopPlatform = detectDesktopPlatform();
  const environmentText = t('aboutWriter.environmentLine').replace(
    '{platform}',
    desktopPlatform,
  );

  const primaryActionLabel =
    updateState.phase === 'checking'
      ? t('aboutWriter.updates.checking')
      : updateState.phase === 'upToDate'
        ? t('aboutWriter.updates.upToDateButton')
        : updateState.phase === 'available'
          ? t('aboutWriter.updates.availableVersion').replace(
              '{version}',
              formatUpdateVersion(updateState.update.version),
            )
          : updateState.phase === 'downloading' ||
              updateState.phase === 'installing'
            ? t('aboutWriter.updates.preparing')
            : updateState.phase === 'error'
              ? t('aboutWriter.updates.downloadFallback')
              : t('aboutWriter.updates.checkButton');

  const primaryActionClassName =
    updateState.phase === 'available' ||
    updateState.phase === 'downloading' ||
    updateState.phase === 'installing'
      ? 'about-writer-primary-action about-writer-primary-action--accent'
      : updateState.phase === 'upToDate'
        ? 'about-writer-primary-action about-writer-primary-action--subtle'
        : 'about-writer-primary-action';

  const isBusy =
    updateState.phase === 'checking' ||
    updateState.phase === 'downloading' ||
    updateState.phase === 'installing';

  const statusHint =
    updateState.phase === 'error'
      ? updateState.reason === 'installFailed'
        ? t('aboutWriter.updates.installError')
        : t('aboutWriter.updates.error')
      : updateState.phase === 'upToDate'
        ? t('aboutWriter.updates.upToDate')
        : null;

  return (
    <div
      className="about-writer-overlay"
      data-viewport-tier={viewportTier}
      role="dialog"
      aria-label={t('aboutWriter.title')}
    >
      <div className="about-writer-backdrop" onClick={onClose} />
      <div className="about-writer-dialog">
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

        <div className="about-writer-content">
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
          </div>

          <div className="about-writer-version-pill">
            <span
              className="about-writer-version-pill__dot"
              aria-hidden="true"
            />
            <span>{currentVersionText}</span>
          </div>

          <div className="about-writer-environment">
            <p>{t('aboutWriter.stackValue')}</p>
            <p>{environmentText}</p>
          </div>

          <div className="about-writer-update">
            <button
              type="button"
              className={primaryActionClassName}
              onClick={() => void handlePrimaryAction()}
              disabled={isBusy}
            >
              {isBusy ? (
                <span
                  className="about-writer-primary-action__spinner"
                  aria-hidden="true"
                />
              ) : null}
              <span>{primaryActionLabel}</span>
            </button>
            {statusHint ? (
              <p className="about-writer-update__hint">{statusHint}</p>
            ) : null}
          </div>
        </div>

        <div className="about-writer-footer">
          <span>{t('aboutWriter.footerCopyright')}</span>
          <div className="about-writer-footer__links">
            <button type="button" className="about-writer-footer__link">
              {t('aboutWriter.documentation.title')}
            </button>
            <button type="button" className="about-writer-footer__link">
              {t('aboutWriter.releaseNotes.title')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
