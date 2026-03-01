import type { BreadcrumbItem } from './useBreadcrumb';
import { truncateBreadcrumb } from './useBreadcrumb';

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  onItemClick: (item: BreadcrumbItem) => void;
  className?: string;
}

export function Breadcrumb({ items, onItemClick, className }: BreadcrumbProps) {
  const segments = truncateBreadcrumb(items, 4);
  const fullPath = items.map((item) => item.name).join(' / ');

  return (
    <nav
      className={`flex items-center text-sm text-zinc-600 ${className ?? ''}`}
      aria-label="File path"
      title={fullPath}
    >
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        return (
          <div key={`${segment.type}-${index}`} className="flex items-center">
            {segment.type === 'ellipsis' ? (
              <span className="text-zinc-400">...</span>
            ) : (
              <button
                type="button"
                className={
                  isLast
                    ? 'text-zinc-800 font-medium cursor-default'
                    : 'hover:text-blue-500 hover:underline cursor-pointer'
                }
                onClick={() => {
                  if (!isLast && segment.item) {
                    onItemClick(segment.item);
                  }
                }}
              >
                {segment.item?.name}
              </button>
            )}
            {!isLast && (
              <span className="text-zinc-300 mx-1.5" aria-hidden="true">
                ›
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
