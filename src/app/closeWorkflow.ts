import { isPathMatch } from '../utils/pathUtils';

export type CloseAction = 'save_then_close' | 'close_now';

export interface CloseActionInput {
  hasDirty: boolean;
  forceCloseRequested: boolean;
}

export const getCloseAction = ({
  hasDirty,
  forceCloseRequested,
}: CloseActionInput): CloseAction => {
  if (hasDirty && !forceCloseRequested) {
    return 'save_then_close';
  }
  return 'close_now';
};

export const getForceCloseHint = (): string =>
  '保存失败，再次点击关闭按钮将强制关闭窗口。';

export const filterSavableDirtyPaths = (
  dirtyPaths: string[],
  workspacePath: string | null,
): string[] => {
  if (!workspacePath) return [];
  return dirtyPaths.filter((path) => isPathMatch(workspacePath, path));
};
