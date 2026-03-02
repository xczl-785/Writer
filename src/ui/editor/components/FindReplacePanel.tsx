type Props = {
  isOpen: boolean;
  isReplaceMode: boolean;
  findQuery: string;
  replaceQuery: string;
  findMatchesCount: number;
  findCountText: string;
  findProgressText: string;
  findInputRef: React.RefObject<HTMLInputElement | null>;
  replaceInputRef: React.RefObject<HTMLInputElement | null>;
  onOpenFind?: () => void;
  onOpenReplace?: () => void;
  onClose: () => void;
  onFindQueryChange: (value: string) => void;
  onReplaceQueryChange: (value: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onReplaceOne: () => void;
  onReplaceAll: () => void;
};

import { t } from '../../../i18n';

export function FindReplacePanel({
  isOpen,
  isReplaceMode,
  findQuery,
  replaceQuery,
  findMatchesCount,
  findCountText,
  findProgressText,
  findInputRef,
  replaceInputRef,
  onOpenFind,
  onOpenReplace,
  onClose,
  onFindQueryChange,
  onReplaceQueryChange,
  onPrev,
  onNext,
  onReplaceOne,
  onReplaceAll,
}: Props) {
  if (!isOpen) {
    if (!onOpenFind || !onOpenReplace) return null;
    return (
      <div className="editor-toolbar__group" aria-label="Find and replace">
        <button
          type="button"
          className="editor-toolbar__button"
          aria-label={t('dialog.find')}
          title={`${t('dialog.find')} (Mod-f)`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onOpenFind}
        >
          {t('dialog.find')}
        </button>
        <button
          type="button"
          className="editor-toolbar__button"
          aria-label={t('dialog.replace')}
          title={`${t('dialog.replace')} (Mod-h)`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onOpenReplace}
        >
          {t('dialog.replace')}
        </button>
      </div>
    );
  }

  return (
    <div
      className="editor-find-panel"
      aria-label="Find and replace"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          if (e.shiftKey) {
            onPrev();
          } else {
            onNext();
          }
        }
      }}
    >
      <input
        ref={findInputRef}
        type="text"
        inputMode="search"
        placeholder={t('dialog.find')}
        aria-label={t('dialog.find')}
        className="editor-find-panel__input"
        value={findQuery}
        onChange={(e) => onFindQueryChange(e.target.value)}
      />

      {isReplaceMode ? (
        <input
          ref={replaceInputRef}
          type="text"
          placeholder={t('dialog.replace')}
          aria-label={t('dialog.replace')}
          className="editor-find-panel__input"
          value={replaceQuery}
          onChange={(e) => onReplaceQueryChange(e.target.value)}
        />
      ) : null}

      <button
        type="button"
        className="editor-find-panel__button"
        aria-label={t('dialog.prev')}
        title={`${t('dialog.prev')} (Shift+Enter)`}
        disabled={!findMatchesCount}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onPrev}
      >
        {t('dialog.prev')}
      </button>
      <button
        type="button"
        className="editor-find-panel__button"
        aria-label={t('dialog.next')}
        title={`${t('dialog.next')} (Enter)`}
        disabled={!findMatchesCount}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onNext}
      >
        {t('dialog.next')}
      </button>

      {isReplaceMode ? (
        <button
          type="button"
          className="editor-find-panel__button"
          aria-label={t('dialog.replace')}
          title={t('dialog.replace')}
          disabled={!findMatchesCount}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onReplaceOne}
        >
          {t('dialog.replace')}
        </button>
      ) : null}

      {isReplaceMode ? (
        <button
          type="button"
          className="editor-find-panel__button"
          aria-label={t('dialog.replaceAll')}
          title={t('dialog.replaceAll')}
          disabled={!findMatchesCount}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onReplaceAll}
        >
          {t('dialog.replaceAll')}
        </button>
      ) : null}

      <span className="editor-find-panel__meta" aria-label="Match count">
        {findCountText}
      </span>

      {findProgressText ? (
        <span className="editor-find-panel__meta" aria-label="Match progress">
          {findProgressText}
        </span>
      ) : null}

      <button
        type="button"
        className="editor-find-panel__button"
        aria-label={t('dialog.close')}
        title={`${t('dialog.close')} (Esc)`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClose}
      >
        X
      </button>
    </div>
  );
}
