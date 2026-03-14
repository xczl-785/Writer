import { useCallback, useEffect, useRef, useState } from 'react';
import { EDITOR_CONFIG } from '../../config/editor';

export function useTransientStatus() {
  const [statusText, setStatusText] = useState('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setTransientStatus = useCallback((next: string) => {
    setStatusText(next);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setStatusText('');
    }, EDITOR_CONFIG.status.transientTimeoutMs);
  }, []);

  const setDestructiveStatus = useCallback(
    (action: string) => {
      setTransientStatus(`${action} deleted`);
    },
    [setTransientStatus],
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    statusText,
    setTransientStatus,
    setDestructiveStatus,
  };
}
