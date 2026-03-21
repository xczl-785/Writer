import { t } from '../../../shared/i18n';

export type AboutWriterPanelProps = {
  isOpen: boolean;
  viewportTier?: 'min' | 'default' | 'airy';
  onClose: () => void;
};

const VERSION = '0.3.6';

export function AboutWriterPanel({
  isOpen,
  viewportTier = 'default',
  onClose,
}: AboutWriterPanelProps) {
  if (!isOpen) {
    return null;
  }

  const currentVersionText = t('aboutWriter.currentVersion').replace(
    '{version}',
    VERSION,
  );

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
            <img
              src="/icon.svg"
              alt={t('aboutWriter.iconAlt')}
              className="about-writer-hero__icon"
            />
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
                  <strong>{VERSION}</strong>
                </div>
                <div>
                  <span>{t('aboutWriter.platformLabel')}</span>
                  <strong>{t('aboutWriter.platformValue')}</strong>
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
          <span>{t('aboutWriter.footerTag')}</span>
        </div>
      </div>
    </div>
  );
}
