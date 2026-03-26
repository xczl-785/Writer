import type { SaveStatus } from '../../state/slices/statusSlice';
import { t } from '../../shared/i18n';

export function countCharacters(value: string): number {
  return Array.from(value).filter((char) => !/\s/u.test(char)).length;
}

export type SyncState = 'local-only' | 'syncing' | 'dirty' | 'synced';

export function deriveSyncState(saveStatus: SaveStatus): SyncState {
  if (saveStatus === 'saving') {
    return 'syncing';
  }

  if (saveStatus === 'dirty' || saveStatus === 'error') {
    return 'dirty';
  }

  return 'synced';
}

export function syncLabel(state: SyncState): string {
  switch (state) {
    case 'local-only':
      return t('status.local');
    default:
      return t('status.sync');
  }
}

export function syncTooltip(state: SyncState): string {
  switch (state) {
    case 'local-only':
      return t('status.localRepo');
    case 'syncing':
      return t('status.syncing');
    case 'dirty':
      return t('status.uncommitted');
    case 'synced':
      return t('status.synced');
    default:
      return t('status.syncStatus');
  }
}
