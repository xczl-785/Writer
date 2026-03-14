import { useEditorStore } from '../state/editorStore';
import { useFileTreeStore } from '../../file/state/fileStore';
import { useStatusStore } from '../../../state/slices/statusSlice';
import { useWorkspaceStore } from '../../workspace/state/workspaceStore';

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
