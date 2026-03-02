import { isPathMatch } from '../utils/pathUtils';
import { t } from '../i18n';

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

export const getForceCloseHint = (): string => t('close.saveFailed');

export const filterSavableDirtyPaths = (
  dirtyPaths: string[],
  workspacePath: string | null,
): string[] => {
  if (!workspacePath) return [];
  return dirtyPaths.filter((path) => isPathMatch(workspacePath, path));
};
