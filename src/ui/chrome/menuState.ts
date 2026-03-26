import type { WorkspaceContext } from '../../domains/workspace/state/workspaceStore';
import { canCreateFromWorkspaceContext } from '../../domains/workspace/services/createEntryCommands';

export type MenuRuntimeState = {
  workspaceContext: WorkspaceContext;
  hasActiveFile: boolean;
  hasRecentItems: boolean;
  hasSelectedRootFolder: boolean;
};

const ALWAYS_ENABLED_IDS = new Set([
  'menu.file.open_file',
  'menu.file.open_folder',
  'menu.file.open_workspace',
  'menu.file.settings',
  'menu.file.exit',
  'menu.view.toggle_sidebar',
  'menu.view.focus_mode',
]);

const RECENT_ITEMS_REQUIRED_IDS = new Set(['menu.file.open_recent']);

const ACTIVE_FILE_REQUIRED_PREFIXES = [
  'menu.edit.',
  'menu.paragraph.',
  'menu.format.',
];

const ACTIVE_FILE_REQUIRED_IDS = new Set([
  'menu.file.save',
  'menu.file.close_file',
  'menu.view.outline',
]);

const WORKSPACE_CONTEXT_REQUIRED_IDS = new Set([
  'menu.file.new',
  'menu.file.new_folder',
  'menu.file.add_folder_to_workspace',
  'menu.file.save_workspace',
  'menu.file.save_workspace_as',
  'menu.file.close_workspace',
]);

function hasWorkspaceContext(state: MenuRuntimeState): boolean {
  return canCreateFromWorkspaceContext(state.workspaceContext);
}

function canCloseFolder(state: MenuRuntimeState): boolean {
  return hasWorkspaceContext(state) && state.hasSelectedRootFolder;
}

export function isMenuItemEnabledForState(
  id: string,
  state: MenuRuntimeState,
  schemaEnabled = true,
): boolean {
  if (!schemaEnabled) {
    return false;
  }

  if (ALWAYS_ENABLED_IDS.has(id)) {
    return true;
  }

  if (RECENT_ITEMS_REQUIRED_IDS.has(id)) {
    return state.hasRecentItems;
  }

  if (id === 'menu.file.close_folder') {
    return canCloseFolder(state);
  }

  if (WORKSPACE_CONTEXT_REQUIRED_IDS.has(id)) {
    return hasWorkspaceContext(state);
  }

  if (ACTIVE_FILE_REQUIRED_IDS.has(id)) {
    return state.hasActiveFile;
  }

  if (ACTIVE_FILE_REQUIRED_PREFIXES.some((prefix) => id.startsWith(prefix))) {
    return state.hasActiveFile;
  }

  return schemaEnabled;
}
