import React from 'react';
import { t } from '../../shared/i18n';
import './StatusBar.css';

export type StatusBarDisplayStatus =
  | 'idle'
  | 'saved'
  | 'dirty'
  | 'saving'
  | 'error';

export type StatusBarErrorAction = {
  label: string;
  run: () => void;
};

export type StatusBarError = {
  reason: string;
  suggestion?: string;
  action?: StatusBarErrorAction;
};

type StatusBarWorkspaceIndicator = {
  type: 'single' | 'multi';
  name: string;
};

export type StatusBarViewProps = {
  activeError?: StatusBarError | null;
  charactersCount: number;
  className?: string;
  displayStatus: StatusBarDisplayStatus;
  encodingLabel: string;
  isFaded?: boolean;
  isFocusZen?: boolean;
  isVisibleInFocusZen?: boolean;
  message?: string | null;
  onEncodingClick?: () => void;
  showMessage?: boolean;
  workspace?: StatusBarWorkspaceIndicator | null;
};

const getStatusClass = (displayStatus: StatusBarDisplayStatus) => {
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

const getStatusText = ({
  activeError,
  displayStatus,
  message,
}: Pick<
  StatusBarViewProps,
  'activeError' | 'displayStatus' | 'message'
>): string => {
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

export const StatusBarView: React.FC<StatusBarViewProps> = ({
  activeError,
  charactersCount,
  className = '',
  displayStatus,
  encodingLabel,
  isFaded = false,
  isFocusZen = false,
  isVisibleInFocusZen = true,
  message = null,
  onEncodingClick,
  showMessage = true,
  workspace = null,
}) => {
  const focusZenClass =
    isFocusZen && !isVisibleInFocusZen ? 'status-bar--focus-zen-hidden' : '';
  const statusText = getStatusText({
    activeError,
    displayStatus,
    message,
  });

  return (
    <div
      className={`status-bar ${getStatusClass(displayStatus)} ${
        isFaded ? 'fade' : ''
      } ${focusZenClass} ${className}`.trim()}
    >
      <div className="status-bar__left">
        <div className="status-indicator-wrap">
          <div className="status-indicator" />
          {displayStatus === 'error' && activeError ? (
            <div className="status-error-panel" role="tooltip">
              <p className="status-error-title">{activeError.reason}</p>
              {activeError.suggestion ? (
                <p className="status-error-suggestion">
                  {activeError.suggestion}
                </p>
              ) : null}
              {activeError.action ? (
                <button
                  type="button"
                  className="status-error-action"
                  onClick={() => activeError.action?.run()}
                >
                  {activeError.action.label}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        {showMessage ? (
          <span className="status-message">{statusText}</span>
        ) : null}
        {workspace ? (
          <div
            className={`status-workspace-indicator ${
              workspace.type === 'multi'
                ? 'status-workspace-indicator--multi'
                : ''
            }`}
          >
            <span className="status-workspace-name">{workspace.name}</span>
          </div>
        ) : null}
      </div>
      <div className="status-bar__right">
        <span className="status-meta">
          {charactersCount} {t('status.chars')}
        </span>
        <button
          type="button"
          className="status-meta status-meta-btn"
          title={`${t('status.encoding')}: ${encodingLabel}`}
          onClick={onEncodingClick}
        >
          {encodingLabel}
        </button>
        <span className="w-2" />
      </div>
    </div>
  );
};
