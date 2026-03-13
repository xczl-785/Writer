import React, { useEffect, useState } from 'react';
import { useStatusStore } from '../../state/slices/statusSlice';
import { useEditorStore } from '../../state/slices/editorSlice';
import { useWorkspaceStore } from '../../state/slices/workspaceSlice';
import { FsService, type GitSyncStatus } from '../../services/fs/FsService';
import {
  countCharacters,
  deriveSyncState,
  syncLabel,
  syncTooltip,
} from './statusBarUtils';
import { t } from '../../i18n';
import './StatusBar.css';

type StatusBarProps = {
  isFocusZen?: boolean;
  isVisibleInFocusZen?: boolean;
};

export const StatusBar: React.FC<StatusBarProps> = ({
  isFocusZen = false,
  isVisibleInFocusZen = true,
}) => {
  const { saveStatus, message, saveError, lastSavedAt, setStatus } =
    useStatusStore();
  const folders = useWorkspaceStore((state) => state.folders);
  const currentPath = folders[0]?.path ?? null;
  const activeFile = useWorkspaceStore((state) => state.activeFile);
  const { fileStates } = useEditorStore();
  const [isFaded, setIsFaded] = useState(false);
  const [gitSync, setGitSync] = useState<GitSyncStatus | null>(null);
  const [encodingLabel, setEncodingLabel] = useState('UTF-8');

  const activeContent = activeFile
    ? (fileStates[activeFile]?.content ?? '')
    : '';
  const charactersCount = countCharacters(activeContent);

  useEffect(() => {
    let disposed = false;
    let timer: number | null = null;

    if (!currentPath) {
      setGitSync(null);
      return;
    }

    const loadSyncStatus = async (): Promise<GitSyncStatus | null> => {
      try {
        const status = await FsService.getGitSyncStatus(currentPath);
        if (!disposed) {
          setGitSync(status);
        }
        return status;
      } catch {
        if (!disposed) {
          setGitSync(null);
        }
        return null;
      }
    };

    void (async () => {
      const initial = await loadSyncStatus();
      if (disposed || !initial?.isRepo) {
        return;
      }
      timer = window.setInterval(() => {
        void loadSyncStatus();
      }, 15000);
    })();

    return () => {
      disposed = true;
      if (timer !== null) {
        window.clearInterval(timer);
      }
    };
  }, [currentPath]);

  useEffect(() => {
    let disposed = false;

    if (!activeFile) {
      setEncodingLabel('UTF-8');
      return;
    }

    void FsService.detectFileEncoding(activeFile)
      .then((result) => {
        if (!disposed) {
          setEncodingLabel(result.label);
        }
      })
      .catch(() => {
        if (!disposed) {
          setEncodingLabel(t('status.unknown'));
        }
      });

    return () => {
      disposed = true;
    };
  }, [activeFile]);

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
        return t('status.unsaved');
      case 'saving':
        return t('status.saving');
      case 'error':
        return saveError?.reason ?? t('status.saveFailed');
      default:
        return t('status.saved');
    }
  };

  const syncState = deriveSyncState(saveStatus, gitSync);
  const focusZenClass =
    isFocusZen && !isVisibleInFocusZen ? 'status-bar--focus-zen-hidden' : '';

  return (
    <div
      className={`status-bar ${getStatusClass()} ${isFaded ? 'fade' : ''} ${focusZenClass}`}
    >
      <div className="status-bar__left">
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
      <div className="status-bar__right">
        <span className="status-meta">
          {charactersCount} {t('status.chars')}
        </span>
        <button
          type="button"
          className="status-meta status-meta-btn"
          title={`${t('status.encoding')}: ${encodingLabel}`}
          onClick={() =>
            setStatus('idle', `${t('status.encoding')}: ${encodingLabel}`)
          }
        >
          {encodingLabel}
        </button>
        <span
          className={`status-sync status-sync--${syncState}`}
          title={syncTooltip(syncState, gitSync)}
        >
          {syncLabel(syncState)}
        </span>
      </div>
    </div>
  );
};
