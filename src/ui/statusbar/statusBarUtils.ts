import type { GitSyncStatus } from '../../services/fs/FsService';
import type { SaveStatus } from '../../state/slices/statusSlice';
import { t } from '../../shared/i18n';

export function countCharacters(value: string): number {
  return Array.from(value).filter((char) => !/\s/u.test(char)).length;
}

export type SyncState =
  | 'no-git'
  | 'local-only'
  | 'syncing'
  | 'dirty'
  | 'ahead'
  | 'behind'
  | 'diverged'
  | 'synced';

export function deriveSyncState(
  saveStatus: SaveStatus,
  git: GitSyncStatus | null,
): SyncState {
  if (!git || !git.isRepo) {
    return 'no-git';
  }

  if (!git.hasRemote) {
    return git.dirty || saveStatus === 'dirty' || saveStatus === 'error'
      ? 'dirty'
      : 'local-only';
  }

  if (saveStatus === 'saving') {
    return 'syncing';
  }

  if (git.dirty || saveStatus === 'dirty' || saveStatus === 'error') {
    return 'dirty';
  }

  if (git.ahead > 0 && git.behind > 0) {
    return 'diverged';
  }
  if (git.ahead > 0) {
    return 'ahead';
  }
  if (git.behind > 0) {
    return 'behind';
  }

  return 'synced';
}

export function syncLabel(state: SyncState): string {
  switch (state) {
    case 'no-git':
      return t('status.sync');
    case 'local-only':
      return t('status.local');
    default:
      return t('status.sync');
  }
}

export function syncTooltip(
  state: SyncState,
  git: GitSyncStatus | null,
): string {
  switch (state) {
    case 'no-git':
      return t('status.noGit');
    case 'local-only':
      return t('status.localRepo');
    case 'syncing':
      return t('status.syncing');
    case 'dirty':
      return t('status.uncommitted');
    case 'ahead':
      return `${t('status.ahead')} ${git?.ahead ?? 0} ${t('status.commits')}`;
    case 'behind':
      return `${t('status.behind')} ${git?.behind ?? 0} ${t('status.commits')}`;
    case 'diverged':
      return `${t('status.diverged')} (${t('status.ahead')} ${git?.ahead ?? 0}, ${t('status.behind')} ${git?.behind ?? 0})`;
    case 'synced':
      return t('status.synced');
    default:
      return t('status.syncStatus');
  }
}
