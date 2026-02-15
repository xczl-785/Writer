import React, { useEffect } from 'react';
import { useStatusStore } from '../../state/slices/statusSlice';
import './StatusBar.css';

export const StatusBar: React.FC = () => {
  const { status, message, setStatus } = useStatusStore();

  useEffect(() => {
    if (status === 'idle' && message) {
      const timer = setTimeout(() => {
        setStatus('idle', null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, message, setStatus]);

  const getStatusClass = () => {
    switch (status) {
      case 'loading':
        return 'loading';
      case 'saving':
        return 'saving';
      case 'error':
        return 'error';
      default:
        return 'idle';
    }
  };

  const getStatusText = () => {
    if (message) return message;
    switch (status) {
      case 'loading':
        return 'Loading...';
      case 'saving':
        return 'Saving...';
      case 'error':
        return 'Error';
      default:
        return 'Ready';
    }
  };

  return (
    <div className={`status-bar ${getStatusClass()}`}>
      <div className="status-indicator" />
      <span className="status-message">{getStatusText()}</span>
    </div>
  );
};
