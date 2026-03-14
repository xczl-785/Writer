import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('import path regression', () => {
  const srcRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

  const readSource = (...segments: string[]) =>
    readFileSync(join(srcRoot, ...segments), 'utf-8');

  it('keeps command and ui imports aligned with the current domain layout', () => {
    const fileCommands = readSource('app', 'commands', 'fileCommands.ts');
    const viewCommands = readSource('app', 'commands', 'viewCommands.ts');
    const legacySettingsPanel = readSource(
      'ui',
      'components',
      'Settings',
      'SettingsPanel.tsx',
    );
    const folderMissingState = readSource(
      'ui',
      'components',
      'ErrorStates',
      'FolderMissingState.tsx',
    );
    const permissionDeniedState = readSource(
      'ui',
      'components',
      'ErrorStates',
      'PermissionDeniedState.tsx',
    );
    const workspaceCorruptedState = readSource(
      'ui',
      'components',
      'ErrorStates',
      'WorkspaceCorruptedState.tsx',
    );
    const deletedFileMarker = readSource(
      'ui',
      'components',
      'ErrorStates',
      'DeletedFileMarker.tsx',
    );
    const editorOrchestrator = readSource(
      'domains',
      'editor',
      'core',
      'EditorOrchestrator.tsx',
    );
    const toolbarShortcuts = readSource(
      'domains',
      'editor',
      'extensions',
      'toolbarShortcuts.ts',
    );
    const useFindReplace = readSource(
      'domains',
      'editor',
      'hooks',
      'useFindReplace.ts',
    );
    const useGhostHint = readSource(
      'domains',
      'editor',
      'hooks',
      'useGhostHint.ts',
    );
    const useInsertTable = readSource(
      'domains',
      'editor',
      'hooks',
      'useInsertTable.ts',
    );
    const useToolbarCommands = readSource(
      'domains',
      'editor',
      'hooks',
      'useToolbarCommands.ts',
    );
    const useTransientStatus = readSource(
      'domains',
      'editor',
      'hooks',
      'useTransientStatus.ts',
    );
    const toolbar = readSource(
      'domains',
      'editor',
      'ui',
      'components',
      'Toolbar.tsx',
    );
    const bubbleMenu = readSource(
      'domains',
      'editor',
      'ui',
      'menus',
      'BubbleMenu.tsx',
    );
    const editorView = readSource(
      'domains',
      'editor',
      'view',
      'EditorView.tsx',
    );
    const sharedOutlineExtractor = readSource(
      'shared',
      'components',
      'Outline',
      'useOutlineExtractor.ts',
    );
    const uiOutlineExtractor = readSource(
      'ui',
      'components',
      'Outline',
      'useOutlineExtractor.ts',
    );
    const workspaceLockDialog = readSource(
      'ui',
      'components',
      'Dialog',
      'WorkspaceLockDialog.ts',
    );

    expect(fileCommands).toContain(
      "import { workspaceActions } from '../../domains/workspace/services/workspaceActions';",
    );
    expect(viewCommands).toContain(
      "import { useSettingsStore } from '../../domains/settings/state/settingsStore';",
    );
    expect(legacySettingsPanel).toContain(
      "import { useSettingsStore } from '../../../domains/settings/state/settingsStore';",
    );
    expect(folderMissingState).toContain(
      "import { workspaceActions } from '../../../domains/workspace/services/workspaceActions';",
    );
    expect(permissionDeniedState).toContain(
      "import { workspaceActions } from '../../../domains/workspace/services/workspaceActions';",
    );
    expect(workspaceCorruptedState).toContain(
      "import { workspaceActions } from '../../../domains/workspace/services/workspaceActions';",
    );
    expect(deletedFileMarker).toContain(
      "import { useFileTreeStore } from '../../../domains/file/state/fileStore';",
    );
    expect(deletedFileMarker).toContain(
      "import { workspaceActions } from '../../../domains/workspace/services/workspaceActions';",
    );
    expect(editorOrchestrator).toContain(
      "import { EditorImpl } from './EditorImpl';",
    );
    expect(toolbarShortcuts).toContain(
      "import { TOOLBAR_COMMANDS, type ToolbarCommandId } from '../core/constants';",
    );
    expect(useFindReplace).toContain(
      "import { FIND_MATCH_LIMIT } from '../core/constants';",
    );
    expect(useFindReplace).toContain("} from '../domain';");
    expect(useGhostHint).toContain(
      "import type { SlashPhase } from '../domain';",
    );
    expect(useGhostHint).toContain(
      "import { isStrictSlashTriggerEligible } from '../ui/menus/slashEligibility';",
    );
    expect(useInsertTable).toContain(
      "import { EDITOR_CONFIG } from '../../../config/editor';",
    );
    expect(useToolbarCommands).toContain(
      "} from '../core/constants';",
    );
    expect(useTransientStatus).toContain(
      "import { EDITOR_CONFIG } from '../../../config/editor';",
    );
    expect(toolbar).toContain(
      "import { TOOLBAR_COMMANDS, type ToolbarCommandId } from '../../core/constants';",
    );
    expect(bubbleMenu).toContain(
      "import { applyLinkAction } from '../../hooks/linkActions';",
    );
    expect(editorView).toContain(
      "import { EditorShell } from '../ui/components/EditorShell';",
    );
    expect(sharedOutlineExtractor).toContain(
      "import { emitTypewriterForceFree } from '../../../domains/editor/domain';",
    );
    expect(uiOutlineExtractor).toContain(
      "import { emitTypewriterForceFree } from '../../../domains/editor/domain';",
    );
    expect(workspaceLockDialog).toContain(
      "import type { WorkspaceLockStatus } from '../../../domains/workspace/services/WorkspaceLockService';",
    );
  });
});
