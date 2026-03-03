import { useEffect, useMemo, useState } from 'react';

export type ViewportTier = 'min' | 'default' | 'airy';

export const resolveViewportTier = (width: number): ViewportTier => {
  if (width <= 640) return 'min';
  if (width >= 1440) return 'airy';
  return 'default';
};

export const createViewportTierDebouncer = (
  apply: (tier: ViewportTier) => void,
  debounceMs = 200,
) => {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return () => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      apply(resolveViewportTier(window.innerWidth));
    }, debounceMs);
  };
};

export const useViewportTier = (debounceMs = 200) => {
  const initialWidth = typeof window === 'undefined' ? 1180 : window.innerWidth;
  const [tier, setTier] = useState<ViewportTier>(resolveViewportTier(initialWidth));

  const onResize = useMemo(
    () => createViewportTierDebouncer(setTier, debounceMs),
    [debounceMs],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, [onResize]);

  return { tier };
};

