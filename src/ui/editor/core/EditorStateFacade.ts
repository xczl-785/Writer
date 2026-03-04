import { useEditorStore } from '../../../state/slices/editorSlice';
import { useFileTreeStore } from '../../../state/slices/filetreeSlice';
import { useStatusStore } from '../../../state/slices/statusSlice';
import { useWorkspaceStore } from '../../../state/slices/workspaceSlice';

/**
 * Consolidated state access point for editor refactor phases.
 * Keeps store wiring in one place while preserving existing behavior.
 */
export function useEditorStateFacade() {
  const workspace = useWorkspaceStore();
  const status = useStatusStore();
  const editor = useEditorStore();
  const fileTree = useFileTreeStore();

  return {
    workspace,
    status,
    editor,
    fileTree,
  };
}

