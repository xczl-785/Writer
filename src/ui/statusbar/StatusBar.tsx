import React, { useEffect, useState } from 'react';
import { useStatusStore } from '../../state/slices/statusSlice';
import { useEditorStore } from '../../domains/editor/state/editorStore';
import {
  getWorkspaceContext,
  getWorkspaceType,
  useWorkspaceStore,
} from '../../domains/workspace/state/workspaceStore';
import { FsService } from '../../domains/file/services/FsService';
import { countCharacters } from './statusBarUtils';
import { getWorkspaceIndicatorLabel } from './workspaceIndicator';
import { t } from '../../shared/i18n';
import { useNotificationStore } from '../../state/slices/notificationSlice';
import { StatusBarView } from './StatusBarView';

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
  const { level1Notification } = useNotificationStore();
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
  const workspaceContext = getWorkspaceContext({
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
  const showWorkspace = workspaceContext !== 'none';

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
    if (!level1Notification && saveStatus === 'saved' && message) {
      const timer = setTimeout(() => {
        setStatus('idle', null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [level1Notification, saveStatus, message, setStatus]);

  useEffect(() => {
    if (level1Notification || saveStatus !== 'saved' || lastSavedAt === null) {
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
  }, [level1Notification, lastSavedAt, saveStatus]);

  const activeLevel1 = level1Notification;
  const activeError = activeLevel1
    ? {
        reason: activeLevel1.reason,
        suggestion: activeLevel1.suggestion,
        action: activeLevel1.actions?.[0],
      }
    : saveError;
  const displayStatus = activeLevel1 ? 'error' : saveStatus;

  const getStatusClass = () => {
    switch (displayStatus) {
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
    if (activeLevel1) return activeLevel1.reason;
    if (message) return message;
    switch (displayStatus) {
      case 'dirty':
        return t('status.unsaved');
      case 'saving':
        return t('status.saving');
      case 'error':
        return activeError?.reason ?? t('status.saveFailed');
      default:
        return t('status.saved');
    }
  };

  return (
    <StatusBarView
      activeError={activeError}
      charactersCount={charactersCount}
      displayStatus={getStatusClass()}
      encodingLabel={encodingLabel}
      isFaded={isFaded}
      isFocusZen={isFocusZen}
      isVisibleInFocusZen={isVisibleInFocusZen}
      message={getStatusText()}
      onEncodingClick={() =>
        setStatus('idle', `${t('status.encoding')}: ${encodingLabel}`)
      }
      workspace={
        showWorkspace
          ? {
              name: workspaceName,
              type: workspaceType === 'multi' ? 'multi' : 'single',
            }
          : null
      }
    />
  );
};
