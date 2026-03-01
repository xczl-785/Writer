import React, { useEffect, useState } from 'react';
import { useStatusStore } from '../../state/slices/statusSlice';
import './StatusBar.css';

export const StatusBar: React.FC = () => {
  const { saveStatus, message, saveError, lastSavedAt, setStatus } =
    useStatusStore();
  const [isFaded, setIsFaded] = useState(false);

  useEffect(() => {
    if (saveStatus === 'saved' && message) {
      const timer = setTimeout(() => {
        setStatus('idle', null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus, message, setStatus]);

  useEffect(() => {
    if (saveStatus !== 'saved' || lastSavedAt === null) {
      const resetTimer = setTimeout(() => {
        setIsFaded(false);
      }, 0);
      return () => clearTimeout(resetTimer);
    }

    const resetTimer = setTimeout(() => {
      setIsFaded(false);
    }, 0);

    const remaining = Math.max(0, 5000 - (Date.now() - lastSavedAt));
    const timer = setTimeout(() => {
      setIsFaded(true);
    }, remaining);
    return () => {
      clearTimeout(resetTimer);
      clearTimeout(timer);
    };
  }, [lastSavedAt, saveStatus]);

  const getStatusClass = () => {
    switch (saveStatus) {
      case 'dirty':
        return 'dirty';
      case 'saving':
        return 'saving';
      case 'error':
        return 'error';
      default:
        return 'saved';
    }
  };

  const getStatusText = () => {
    if (message) return message;
    switch (saveStatus) {
      case 'dirty':
        return 'Unsaved';
      case 'saving':
        return 'Saving...';
      case 'error':
        return saveError?.reason ?? 'Save failed';
      default:
        return 'Saved';
    }
  };

  return (
    <div className={`status-bar ${getStatusClass()} ${isFaded ? 'fade' : ''}`}>
      <div className="status-indicator-wrap">
        <div className="status-indicator" />
        {saveStatus === 'error' && saveError ? (
          <div className="status-error-panel" role="tooltip">
            <p className="status-error-title">{saveError.reason}</p>
            <p className="status-error-suggestion">{saveError.suggestion}</p>
            {saveError.action ? (
              <button
                type="button"
                className="status-error-action"
                onClick={() => saveError.action?.run()}
              >
                {saveError.action.label}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <span className="status-message">{getStatusText()}</span>
    </div>
  );
};
