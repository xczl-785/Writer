import { useEffect, useRef, useState } from 'react';

export type InlineCommitTrigger = 'enter' | 'blur';
export type InlineCancelTrigger = 'escape' | 'blur-empty';

interface InlineInputProps {
  value: string;
  placeholder?: string;
  onCommit: (value: string, trigger: InlineCommitTrigger) => void;
  onCancel: (trigger: InlineCancelTrigger) => void;
  className?: string;
  autoFocus?: boolean;
}

export function InlineInput({
  value,
  placeholder,
  onCommit,
  onCancel,
  className = '',
  autoFocus = true,
}: InlineInputProps) {
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [autoFocus]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      onCommit(draft, 'enter');
    } else if (e.key === 'Esc' || e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onCancel('escape');
    }
  };

  const handleBlur = () => {
    if (!draft.trim()) {
      onCancel('blur-empty');
    } else {
      onCommit(draft, 'blur');
    }
  };

  return (
    <input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      onClick={(e) => e.stopPropagation()}
      placeholder={placeholder}
      className={`w-full bg-transparent outline-none border-none p-0 m-0 leading-none h-auto ${className}`}
      spellCheck={false}
    />
  );
}
