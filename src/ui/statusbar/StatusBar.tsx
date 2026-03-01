import React, { useEffect, useState } from 'react';
import { useStatusStore } from '../../state/slices/statusSlice';
import { useEditorStore } from '../../state/slices/editorSlice';
import { useWorkspaceStore } from '../../state/slices/workspaceSlice';
import { FsService } from '../../services/fs/FsService';
import './StatusBar.css';

export const StatusBar: React.FC = () => {
  const { saveStatus, message, saveError, lastSavedAt, setStatus } =
    useStatusStore();
  const { currentPath, activeFile } = useWorkspaceStore();
  const { fileStates } = useEditorStore();
  const [isFaded, setIsFaded] = useState(false);
  const [isGitRepo, setIsGitRepo] = useState(false);

  const countWords = (value: string): number => {
    const latinWords = value.match(/[A-Za-z0-9_]+/g)?.length ?? 0;
    const cjkChars = value.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
    return latinWords + cjkChars;
  };

  const activeContent = activeFile ? fileStates[activeFile]?.content ?? '' : '';
  const wordsCount = countWords(activeContent);

  useEffect(() => {
    let disposed = false;

    if (!currentPath) {
      setIsGitRepo(false);
      return;
    }

    void FsService.checkExists(`${currentPath}/.git`)
      .then((exists) => {
        if (!disposed) {
          setIsGitRepo(Boolean(exists));
        }
      })
      .catch(() => {
        if (!disposed) {
          setIsGitRepo(false);
        }
      });

    return () => {
      disposed = true;
    };
  }, [currentPath]);

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
        <span className="status-meta">{wordsCount} words</span>
        <span className="status-meta">UTF-8</span>
        <span className={`status-sync ${isGitRepo ? '' : 'is-muted'}`}>Sync</span>
      </div>
    </div>
  );
};
