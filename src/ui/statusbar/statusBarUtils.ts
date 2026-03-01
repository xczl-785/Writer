import type { GitSyncStatus } from '../../services/fs/FsService';
import type { SaveStatus } from '../../state/slices/statusSlice';

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
      return 'SYNC';
    case 'local-only':
      return 'LOCAL';
    default:
      return 'SYNC';
  }
}

export function syncTooltip(state: SyncState, git: GitSyncStatus | null): string {
  switch (state) {
    case 'no-git':
      return 'No Git repository';
    case 'local-only':
      return 'Local repository (no upstream)';
    case 'syncing':
      return 'Saving changes...';
    case 'dirty':
      return 'Uncommitted changes';
    case 'ahead':
      return `Ahead ${git?.ahead ?? 0} commit(s)`;
    case 'behind':
      return `Behind ${git?.behind ?? 0} commit(s)`;
    case 'diverged':
      return `Diverged (ahead ${git?.ahead ?? 0}, behind ${git?.behind ?? 0})`;
    case 'synced':
      return 'Synced with upstream';
    default:
      return 'Sync status';
  }
}
