import {
  getWorkspaceType,
  isUntitledWorkspace,
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

export function getWorkspaceIndicatorLabel(
  workspace: Pick<WorkspaceState, 'folders' | 'workspaceFile' | 'isDirty'>,
): string {
  const workspaceType = getWorkspaceType({
    folders: workspace.folders,
    workspaceFile: workspace.workspaceFile,
    isDirty: workspace.isDirty,
    openFiles: [],
    activeFile: null,
  });

  if (workspaceType === 'empty') {
    return '';
  }

  if (workspaceType === 'single') {
    const folder = workspace.folders[0];
    return folder?.name ?? folder?.path.split('/').pop() ?? '';
  }

  if (isUntitledWorkspace({
    folders: workspace.folders,
    workspaceFile: workspace.workspaceFile,
    isDirty: workspace.isDirty,
    openFiles: [],
    activeFile: null,
  })) {
    return t('workspace.untitledUnsaved');
  }

  if (workspace.workspaceFile) {
    return `${getWorkspaceFileBaseName(workspace.workspaceFile)} ${t('workspace.savedSuffix')}`;
  }

  return '';
}

export function buildDefaultWorkspaceFileName(
  workspace: Pick<WorkspaceState, 'folders' | 'workspaceFile' | 'isDirty'>,
): string {
  if (workspace.workspaceFile) {
    return `${getWorkspaceFileBaseName(workspace.workspaceFile)}${WORKSPACE_FILE_SUFFIX}`;
  }

  const workspaceType = getWorkspaceType({
    folders: workspace.folders,
    workspaceFile: workspace.workspaceFile,
    isDirty: workspace.isDirty,
    openFiles: [],
    activeFile: null,
  });

  if (workspaceType === 'single') {
    const folder = workspace.folders[0];
    const baseName = folder?.name ?? folder?.path.split('/').pop() ?? 'workspace';
    return `${baseName}${WORKSPACE_FILE_SUFFIX}`;
  }

  return `未命名工作区${WORKSPACE_FILE_SUFFIX}`;
}
