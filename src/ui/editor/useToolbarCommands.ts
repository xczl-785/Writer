import type { Editor as TiptapEditor } from '@tiptap/react';
import { useCallback, useMemo } from 'react';
import {
  TOOLBAR_COMMANDS,
  type ToolbarCommandId,
  type ToolbarCommandSpec,
} from './constants';

type UseToolbarCommandsArgs = {
  hasEditorWidgetFocus: boolean;
  setTransientStatus: (message: string) => void;
  setDestructiveStatus: (action: string) => void;
};

export function useToolbarCommands({
  hasEditorWidgetFocus,
  setTransientStatus,
  setDestructiveStatus,
}: UseToolbarCommandsArgs) {
  const toolbarCommandById = useMemo(() => {
    const map = new Map<ToolbarCommandId, ToolbarCommandSpec>();
    for (const cmd of TOOLBAR_COMMANDS) map.set(cmd.id, cmd);
    return map;
  }, []);

  const runToolbarCommand = useCallback(
    (editor: TiptapEditor, id: ToolbarCommandId) => {
      const cmd = toolbarCommandById.get(id);
      if (!cmd) return false;

      if (!hasEditorWidgetFocus) {
        setTransientStatus('Focus editor to enable toolbar');
        return false;
      }

      if (!cmd.canRun(editor)) {
        setTransientStatus(`${cmd.ariaLabel} unavailable`);
        return false;
      }

      const ran = cmd.run(editor);
      if (ran) {
        if (id.startsWith('delete')) {
          setDestructiveStatus(cmd.ariaLabel.replace(/^Delete\s+/i, ''));
        } else {
          setTransientStatus(cmd.ariaLabel);
        }
      }
      return ran;
    },
    [
      hasEditorWidgetFocus,
      setDestructiveStatus,
      setTransientStatus,
      toolbarCommandById,
    ],
  );

  return {
    runToolbarCommand,
  };
}
