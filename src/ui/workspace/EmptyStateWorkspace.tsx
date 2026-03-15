import React, { useCallback, useState } from 'react';
import { Briefcase, FileText, Folder, Sparkles } from 'lucide-react';
import { t } from '../../i18n';
import { type RecentItem } from '../../domains/workspace/services/RecentItemsService';
import { DragDropHint } from '../components/ErrorStates';

type EmptyStateMode = 'welcome' | 'saved-empty';

interface EmptyStateWorkspaceProps {
  onOpenFolder: () => void;
  onOpenWorkspace: () => void;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  onDropItem?: (paths: string[]) => void;
  onSelectRecentItem?: (item: RecentItem) => void;
  recentItems?: RecentItem[];
  isDragOver?: boolean;
  dragClassificationType?: 'files' | 'folders' | null;
  mode?: EmptyStateMode;
  workspaceName?: string;
}

function getRecentItemIcon(type: string): React.ReactNode {
  switch (type) {
    case 'workspace':
      return <Briefcase className="w-4 h-4 mr-2.5 text-zinc-400" />;
    case 'folder':
      return <Folder className="w-4 h-4 mr-2.5 text-zinc-400" />;
    case 'file':
    default:
      return <FileText className="w-4 h-4 mr-2.5 text-zinc-400" />;
  }
}

function getEmptyStateCopy(
  mode: EmptyStateMode,
  workspaceName?: string,
): {
  title: string;
  description: string;
  primaryLabel: string;
  secondaryLabel: string;
} {
  if (mode === 'saved-empty') {
    return {
      title: '当前工作区未包含文件夹',
      description: workspaceName
        ? `你仍位于工作区“${workspaceName}”中。可继续将文件夹添加到该工作区，或关闭当前工作区。`
        : '你仍位于当前工作区中。可继续将文件夹添加到该工作区，或关闭当前工作区。',
      primaryLabel: t('workspace.addFolderToWorkspace'),
      secondaryLabel: t('workspace.closeTitle'),
    };
  }

  return {
    title: 'Writer',
    description: '写作，心流。',
    primaryLabel: t('workspace.openFolder'),
    secondaryLabel: t('workspace.openWorkspace'),
  };
}

export const EmptyStateWorkspace: React.FC<EmptyStateWorkspaceProps> = ({
  onOpenFolder,
  onOpenWorkspace,
  onPrimaryAction,
  onSecondaryAction,
  onDropItem,
  onSelectRecentItem,
  recentItems = [],
  isDragOver = false,
  dragClassificationType = null,
  mode = 'welcome',
  workspaceName,
}) => {
  const [isLocalDragOver, setIsLocalDragOver] = useState(false);
  const copy = getEmptyStateCopy(mode, workspaceName);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsLocalDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsLocalDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsLocalDragOver(false);

      const files = e.dataTransfer.files as FileList & {
        [index: number]: File & { path?: string };
      };
      if (files.length > 0 && onDropItem) {
        const paths: string[] = [];

        for (let index = 0; index < files.length; index += 1) {
          const path = files[index]?.path;
          if (path) {
            paths.push(path);
          }
        }

        if (paths.length > 0) {
          onDropItem(paths);
        } else {
          onOpenFolder();
        }
      } else if (files.length > 0) {
        onOpenFolder();
      }
    },
    [onDropItem, onOpenFolder],
  );

  const handleRecentItemClick = useCallback(
    (item: RecentItem) => {
      if (onSelectRecentItem) {
        onSelectRecentItem(item);
      }
    },
    [onSelectRecentItem],
  );

  const primaryAction = onPrimaryAction ?? onOpenFolder;
  const secondaryAction = onSecondaryAction ?? onOpenWorkspace;
  const showRecentItems = mode === 'welcome' && recentItems.length > 0;

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center bg-white z-20"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="application"
      aria-label="Empty State Workspace"
    >
      {(isLocalDragOver || isDragOver) && (
        <DragDropHint
          label={
            dragClassificationType === 'folders'
              ? t('fileDrop.openWorkspace')
              : t('fileDrop.openFile')
          }
        />
      )}

      <div className="w-full max-w-md py-20 flex flex-col items-center">
        <div className="mb-1">
          <Sparkles className="w-10 h-10 text-zinc-900" />
        </div>
        <div className="text-xl font-bold mb-1">{copy.title}</div>
        <div className="text-sm text-zinc-400 mb-10 italic text-center px-8">
          {copy.description}
        </div>

        <div className="flex space-x-4 mb-10">
          <button
            className="px-6 py-2 bg-zinc-900 text-white text-sm font-medium rounded-md hover:bg-zinc-800 transition-colors shadow-sm cursor-pointer"
            onClick={primaryAction}
            type="button"
          >
            {copy.primaryLabel}
          </button>
          <button
            className="px-6 py-2 border border-zinc-200 text-zinc-600 text-sm font-medium rounded-md hover:bg-zinc-50 transition-colors cursor-pointer"
            onClick={secondaryAction}
            type="button"
          >
            {copy.secondaryLabel}
          </button>
        </div>

        {showRecentItems && (
          <div className="w-full px-8">
            <div className="flex items-center text-zinc-300 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">
              <div className="flex-grow border-t border-zinc-200 mr-3"></div>
              {t('workspace.recent')}
              <div className="flex-grow border-t border-zinc-200 ml-3"></div>
            </div>
            <div className="space-y-1">
              {recentItems.slice(0, 5).map((item) => (
                <button
                  key={item.path}
                  type="button"
                  className="w-full flex items-center text-sm p-2 rounded hover:bg-zinc-100/50 text-zinc-700 cursor-pointer transition-colors text-left"
                  title={item.path}
                  onClick={() => handleRecentItemClick(item)}
                >
                  {getRecentItemIcon(item.type)}
                  <span className="truncate">{item.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="w-full px-8">
          <p className="mt-8 text-center text-xs text-zinc-300 italic">
            {mode === 'saved-empty'
              ? t('workspace.dropBlockedHint')
              : t('workspace.dragHint')}
          </p>
        </div>
      </div>
    </div>
  );
};
