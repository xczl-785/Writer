export type MenuRuntimeState = {
  hasWorkspace: boolean;
  hasWorkspaceFile: boolean;
  hasActiveFile: boolean;
  hasDirtyActiveFile: boolean;
  hasRecentItems: boolean;
  isSidebarVisible: boolean;
};

const ALWAYS_ENABLED_IDS = new Set([
  'menu.file.new',
  'menu.file.open_folder',
  'menu.file.settings',
  'menu.view.toggle_sidebar',
  'menu.view.focus_mode',
]);

const WORKSPACE_REQUIRED_IDS = new Set([
  'menu.file.close_folder',
  'menu.file.save_workspace',
  'menu.file.save_workspace_as',
  'menu.view.outline',
]);

const ACTIVE_FILE_REQUIRED_PREFIXES = [
  'menu.edit.',
  'menu.paragraph.',
  'menu.format.',
];

const ACTIVE_FILE_REQUIRED_IDS = new Set(['menu.file.save']);

const RECENT_ITEMS_REQUIRED_IDS = new Set([
  'menu.file.open_recent',
  'menu.file.clear_recent',
]);

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

  if (WORKSPACE_REQUIRED_IDS.has(id)) {
    return state.hasWorkspace;
  }

  if (ACTIVE_FILE_REQUIRED_IDS.has(id)) {
    return state.hasActiveFile;
  }

  if (
    ACTIVE_FILE_REQUIRED_PREFIXES.some((prefix) => id.startsWith(prefix))
  ) {
    return state.hasActiveFile;
  }

  if (RECENT_ITEMS_REQUIRED_IDS.has(id)) {
    return state.hasRecentItems;
  }

  return schemaEnabled;
}
