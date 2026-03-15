import {
  getWorkspaceContext,
  type WorkspaceState,
} from '../../domains/workspace/state/workspaceStore';
import { t } from '../../shared/i18n';

const WORKSPACE_FILE_SUFFIX = '.writer-workspace';

export function getWorkspaceFileBaseName(path: string): string {
  const fileName = path.split('/').pop() || path;
  return fileName.endsWith(WORKSPACE_FILE_SUFFIX)
    ? fileName.slice(0, -WORKSPACE_FILE_SUFFIX.length)
    : fileName;
}

function getSavedWorkspaceLabel(workspaceFile: string): string {
  return `${getWorkspaceFileBaseName(workspaceFile)} ${t('workspace.savedSuffix')}`;
}

export function getWorkspaceIndicatorLabel(
  workspace: Pick<WorkspaceState, 'folders' | 'workspaceFile' | 'isDirty'>,
): string {
  const workspaceContext = getWorkspaceContext({
    folders: workspace.folders,
    workspaceFile: workspace.workspaceFile,
    isDirty: workspace.isDirty,
    openFiles: [],
    activeFile: null,
  });

  if (workspaceContext === 'none') {
    return '';
  }

  if (workspaceContext === 'single-temporary') {
    const folder = workspace.folders[0];
    return folder?.name ?? folder?.path.split('/').pop() ?? '';
  }

  if (workspaceContext === 'multi-unsaved') {
    return t('workspace.untitledUnsaved');
  }

  if (workspace.workspaceFile) {
    return getSavedWorkspaceLabel(workspace.workspaceFile);
  }

  return '';
}

export function buildDefaultWorkspaceFileName(
  workspace: Pick<WorkspaceState, 'folders' | 'workspaceFile' | 'isDirty'>,
): string {
  if (workspace.workspaceFile) {
    return `${getWorkspaceFileBaseName(workspace.workspaceFile)}${WORKSPACE_FILE_SUFFIX}`;
  }

  const workspaceContext = getWorkspaceContext({
    folders: workspace.folders,
    workspaceFile: workspace.workspaceFile,
    isDirty: workspace.isDirty,
    openFiles: [],
    activeFile: null,
  });

  if (workspaceContext === 'single-temporary') {
    const folder = workspace.folders[0];
    const baseName = folder?.name ?? folder?.path.split('/').pop() ?? 'workspace';
    return `${baseName}${WORKSPACE_FILE_SUFFIX}`;
  }

  return `${t('workspace.untitledUnsaved').replace(' (未保存)', '').replace(' (Unsaved)', '')}${WORKSPACE_FILE_SUFFIX}`;
}
