/**
 * Ghost hint component for slash menu
 *
 * Shows a hint when cursor is at an empty line.
 */
import { t } from '../../../i18n';

export type GhostHintPosition = {
  open: boolean;
  x: number;
  y: number;
};

export type GhostHintProps = {
  position: GhostHintPosition;
};

export function GhostHint({ position }: GhostHintProps) {
  if (!position.open) return null;

  return (
    <div
      className={`editor-ghost-slash ${position.open ? 'is-open' : ''}`}
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <span className="editor-ghost-slash__text">{t('ghostHint.prefix')}</span>
      <kbd className="editor-ghost-slash__trigger">{t('ghostHint.trigger')}</kbd>
      <span className="editor-ghost-slash__text">{t('ghostHint.suffix')}</span>
    </div>
  );
}
