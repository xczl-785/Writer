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
          aria-label="Find"
          title="Find (Mod-f)"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onOpenFind}
        >
          Find
        </button>
        <button
          type="button"
          className="editor-toolbar__button"
          aria-label="Replace"
          title="Replace (Mod-h)"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onOpenReplace}
        >
          Replace
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
        placeholder="Find"
        aria-label="Find"
        className="editor-find-panel__input"
        value={findQuery}
        onChange={(e) => onFindQueryChange(e.target.value)}
      />

      {isReplaceMode ? (
        <input
          ref={replaceInputRef}
          type="text"
          placeholder="Replace"
          aria-label="Replace"
          className="editor-find-panel__input"
          value={replaceQuery}
          onChange={(e) => onReplaceQueryChange(e.target.value)}
        />
      ) : null}

      <button
        type="button"
        className="editor-find-panel__button"
        aria-label="Previous match"
        title="Previous match (Shift+Enter)"
        disabled={!findMatchesCount}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onPrev}
      >
        Prev
      </button>
      <button
        type="button"
        className="editor-find-panel__button"
        aria-label="Next match"
        title="Next match (Enter)"
        disabled={!findMatchesCount}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onNext}
      >
        Next
      </button>

      {isReplaceMode ? (
        <button
          type="button"
          className="editor-find-panel__button"
          aria-label="Replace match"
          title="Replace current match"
          disabled={!findMatchesCount}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onReplaceOne}
        >
          Replace
        </button>
      ) : null}

      {isReplaceMode ? (
        <button
          type="button"
          className="editor-find-panel__button"
          aria-label="Replace all matches"
          title="Replace all matches"
          disabled={!findMatchesCount}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onReplaceAll}
        >
          Replace all
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
        aria-label="Close find"
        title="Close (Esc)"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClose}
      >
        X
      </button>
    </div>
  );
}
