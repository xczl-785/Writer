import { useEffect, useState } from 'react';

const MENU_OPEN_SELECTOR = '[data-menu-open]';

export const useFocusZenWakeup = ({
  enabled,
  threshold = 50,
}: {
  enabled: boolean;
  threshold?: number;
}) => {
  const [isHeaderAwake, setIsHeaderAwake] = useState(true);
  const [isFooterAwake, setIsFooterAwake] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setIsHeaderAwake(true);
      setIsFooterAwake(true);
      return;
    }

    setIsHeaderAwake(false);
    setIsFooterAwake(false);

    const onMouseMove = (event: MouseEvent) => {
      const height = window.innerHeight;
      const hasOpenMenu = document.querySelector(MENU_OPEN_SELECTOR) !== null;
      setIsHeaderAwake(hasOpenMenu || event.clientY <= threshold);
      setIsFooterAwake(event.clientY >= height - threshold);
    };

    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, [enabled, threshold]);

  return { isHeaderAwake, isFooterAwake };
};
