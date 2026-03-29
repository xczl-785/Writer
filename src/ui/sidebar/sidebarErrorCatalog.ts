import { t } from '../../shared/i18n';

export type SidebarErrorKey =
  | 'create'
  | 'copyPath'
  | 'reveal'
  | 'delete'
  | 'move'
  | 'rename'
  | 'rootRemove'
  | 'rootReveal'
  | 'rootCopyPath';

type SidebarErrorMeta = {
  source: string;
  reason: string;
  suggestion: string;
};

export function getSidebarErrorMeta(key: SidebarErrorKey): SidebarErrorMeta {
  switch (key) {
    case 'create':
      return {
        source: 'sidebar-create',
        reason: t('sidebar.createFailed'),
        suggestion: t('sidebar.tryDifferent'),
      };
    case 'copyPath':
      return {
        source: 'sidebar-copy-path',
        reason: t('sidebar.copyFailed'),
        suggestion: t('sidebar.copyRetrySuggestion'),
      };
    case 'reveal':
      return {
        source: 'sidebar-reveal',
        reason: t('sidebar.revealFailed'),
        suggestion: t('sidebar.revealRetrySuggestion'),
      };
    case 'delete':
      return {
        source: 'sidebar-delete',
        reason: t('sidebar.deleteFailed'),
        suggestion: t('sidebar.deleteRetrySuggestion'),
      };
    case 'move':
      return {
        source: 'sidebar-move',
        reason: t('sidebar.moveFailed'),
        suggestion: t('sidebar.moveRetrySuggestion'),
      };
    case 'rename':
      return {
        source: 'sidebar-rename',
        reason: t('sidebar.renameFailed'),
        suggestion: t('sidebar.renameRetrySuggestion'),
      };
    case 'rootRemove':
      return {
        source: 'sidebar-root-remove',
        reason: t('workspace.removeFailed'),
        suggestion: t('workspace.removeRetrySuggestion'),
      };
    case 'rootReveal':
      return {
        source: 'sidebar-root-reveal',
        reason: t('sidebar.revealFailed'),
        suggestion: t('sidebar.revealRetrySuggestion'),
      };
    case 'rootCopyPath':
      return {
        source: 'sidebar-root-copy-path',
        reason: t('sidebar.copyFailed'),
        suggestion: t('sidebar.copyRetrySuggestion'),
      };
  }
}
