import type { ReactNode } from 'react';
import { FolderDown } from 'lucide-react';

type DragDropHintTone = 'default' | 'sidebar';

export type DragDropHintProps = {
  label: string;
  className?: string;
  tone?: DragDropHintTone;
  icon?: ReactNode;
};

export function DragDropHint({
  label,
  className = '',
  tone = 'default',
  icon,
}: DragDropHintProps) {
  const containerClassName =
    tone === 'sidebar'
      ? 'absolute inset-3 flex items-center justify-center rounded-xl border border-zinc-300 bg-zinc-50'
      : 'flex w-full max-w-[640px] flex-col items-center rounded-2xl border border-zinc-300 bg-zinc-50 px-8 py-20';
  const contentClassName =
    tone === 'sidebar' ? 'flex flex-col items-center px-8 py-12' : '';
  const iconClassName =
    tone === 'sidebar'
      ? 'mb-4 h-10 w-10 text-zinc-400'
      : 'mb-5 h-14 w-14 text-zinc-400';
  const labelClassName =
    tone === 'sidebar'
      ? 'text-sm font-medium text-zinc-600'
      : 'text-[18px] font-medium text-zinc-600';

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-zinc-50/90 ${className}`}
    >
      <div className={containerClassName}>
        <div className={contentClassName}>
          {icon ?? <FolderDown className={iconClassName} />}
          <div className={labelClassName}>{label}</div>
        </div>
      </div>
    </div>
  );
}
