import React, { useEffect, useState } from 'react';
import { useStatusStore } from '../../state/slices/statusSlice';
import { useEditorStore } from '../domains/editor/state/editorStore';
import {
  useWorkspaceStore,
  getWorkspaceType,
} from '../domains/workspace/state/workspaceStore';
import { FsService } from '../../services/fs/FsService';
import { countCharacters } from './statusBarUtils';
import { getWorkspaceIndicatorLabel } from './workspaceIndicator';
import { t } from '../../shared/i18n';
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
  const { folders, activeFile, workspaceFile, isDirty } = useWorkspaceStore();
  const { fileStates } = useEditorStore();
  const [isFaded, setIsFaded] = useState(false);
  const [encodingLabel, setEncodingLabel] = useState('UTF-8');

  const activeContent = activeFile
    ? (fileStates[activeFile]?.content ?? '')
    : '';
  const charactersCount = countCharacters(activeContent);

  // 计算工作区类型和名称
  const workspaceType = getWorkspaceType({
    folders,
    workspaceFile,
    isDirty,
    openFiles: [],
    activeFile: null,
  });
  const workspaceName = getWorkspaceIndicatorLabel({
    folders,
    workspaceFile,
    isDirty,
  });
  const showWorkspace = workspaceType !== 'empty';

  useEffect(() => {
    let disposed = false;

    if (!activeFile) {
      // 使用 setTimeout 避免在 effect 中同步调用 setState
      const timer = setTimeout(() => {
        if (!disposed) {
          setEncodingLabel('UTF-8');
        }
      }, 0);
      return () => {
        disposed = true;
        clearTimeout(timer);
      };
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
        {/* 工作区标识 - V6规范 */}
        {showWorkspace && (
          <div
            className={`status-workspace-indicator ${
              workspaceType === 'multi'
                ? 'status-workspace-indicator--multi'
                : ''
            }`}
          >
            <span className="status-workspace-name">{workspaceName}</span>
          </div>
        )}
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
        {/* SYNC 已移除，保留占位 */}
        <span className="w-2" />
      </div>
    </div>
  );
};
