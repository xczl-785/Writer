export const EXPLORER_COMMANDS = {
  NEW_FILE: 'explorer.newFile',
  NEW_FOLDER: 'explorer.newFolder',
  RENAME: 'explorer.rename',
  DELETE: 'explorer.delete',
  OPEN_WORKSPACE: 'explorer.openWorkspace',
} as const;

export type ExplorerCommandId =
  (typeof EXPLORER_COMMANDS)[keyof typeof EXPLORER_COMMANDS];

interface ExplorerCommandContext {
  hasWorkspace: boolean;
  hasSelection: boolean;
  openWorkspace: () => void;
  beginCreateFile: () => void;
  beginCreateFolder: () => void;
  beginRenameSelection: () => void;
  requestDeleteSelection: () => void;
  showWorkspaceRequiredAlert: () => void;
}

export const dispatchExplorerCommand = (
  command: ExplorerCommandId,
  ctx: ExplorerCommandContext,
): void => {
  switch (command) {
    case EXPLORER_COMMANDS.OPEN_WORKSPACE:
      ctx.openWorkspace();
      return;
    case EXPLORER_COMMANDS.NEW_FILE:
      if (!ctx.hasWorkspace) {
        ctx.showWorkspaceRequiredAlert();
        return;
      }
      ctx.beginCreateFile();
      return;
    case EXPLORER_COMMANDS.NEW_FOLDER:
      if (!ctx.hasWorkspace) {
        ctx.showWorkspaceRequiredAlert();
        return;
      }
      ctx.beginCreateFolder();
      return;
    case EXPLORER_COMMANDS.RENAME:
      if (!ctx.hasWorkspace || !ctx.hasSelection) {
        return;
      }
      ctx.beginRenameSelection();
      return;
    case EXPLORER_COMMANDS.DELETE:
      if (!ctx.hasWorkspace || !ctx.hasSelection) {
        return;
      }
      ctx.requestDeleteSelection();
      return;
    default:
      return;
  }
};
