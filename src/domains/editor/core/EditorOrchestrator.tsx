import { forwardRef } from 'react';
import type { EditorHandle, EditorProps } from './editorTypes';
import { EditorImpl } from './EditorImpl';

/**
 * Temporary orchestration entry for phased refactor.
 * Current behavior is delegated to the legacy Editor component.
 */
export const EditorOrchestrator = forwardRef<EditorHandle, EditorProps>(
  (props, ref) => <EditorImpl {...props} ref={ref} />,
);

EditorOrchestrator.displayName = 'EditorOrchestrator';

export default EditorOrchestrator;
