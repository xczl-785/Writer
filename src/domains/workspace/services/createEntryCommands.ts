import {
  EXPLORER_COMMANDS,
  type ExplorerCommandId,
} from '../../../ui/sidebar/explorerCommands';

export const SIDEBAR_CREATE_TARGETS = {
  NEW_FILE: 'new-file',
  NEW_FOLDER: 'new-folder',
} as const;

export type SidebarCreateTarget =
  (typeof SIDEBAR_CREATE_TARGETS)[keyof typeof SIDEBAR_CREATE_TARGETS];

const MENU_TO_CREATE_TARGET: Record<string, SidebarCreateTarget> = {
  'menu.file.new': SIDEBAR_CREATE_TARGETS.NEW_FILE,
  'menu.file.new_folder': SIDEBAR_CREATE_TARGETS.NEW_FOLDER,
};

const CREATE_TARGET_TO_EXPLORER_COMMAND: Record<
  SidebarCreateTarget,
  ExplorerCommandId
> = {
  [SIDEBAR_CREATE_TARGETS.NEW_FILE]: EXPLORER_COMMANDS.NEW_FILE,
  [SIDEBAR_CREATE_TARGETS.NEW_FOLDER]: EXPLORER_COMMANDS.NEW_FOLDER,
};

export function resolveCreateEntryMenuTarget(
  menuId: string,
): SidebarCreateTarget | null {
  return MENU_TO_CREATE_TARGET[menuId] ?? null;
}

export function resolveCreateEntryExplorerCommand(
  createTarget: string,
): ExplorerCommandId | null {
  if (createTarget === SIDEBAR_CREATE_TARGETS.NEW_FILE) {
    return CREATE_TARGET_TO_EXPLORER_COMMAND[SIDEBAR_CREATE_TARGETS.NEW_FILE];
  }
  if (createTarget === SIDEBAR_CREATE_TARGETS.NEW_FOLDER) {
    return CREATE_TARGET_TO_EXPLORER_COMMAND[SIDEBAR_CREATE_TARGETS.NEW_FOLDER];
  }
  return null;
}

export function canCreateFromWorkspace(currentPath: string | null): boolean {
  return Boolean(currentPath);
}

export function dispatchCreateEntry({
  createTarget,
  isSidebarVisible,
  setIsSidebarVisible,
  emit,
}: {
  createTarget: SidebarCreateTarget;
  isSidebarVisible: boolean;
  setIsSidebarVisible: (value: boolean | ((prev: boolean) => boolean)) => void;
  emit: (target: SidebarCreateTarget) => void;
}): void {
  if (!isSidebarVisible) {
    setIsSidebarVisible(true);
    window.setTimeout(() => {
      emit(createTarget);
    }, 0);
    return;
  }

  emit(createTarget);
}
