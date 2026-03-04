import { forwardRef } from 'react';
import type { EditorHandle, EditorProps } from '../Editor';
import { Editor } from '../Editor';

/**
 * Temporary orchestration entry for phased refactor.
 * Current behavior is delegated to the legacy Editor component.
 */
export const EditorOrchestrator = forwardRef<EditorHandle, EditorProps>(
  (props, ref) => <Editor {...props} ref={ref} />,
);

EditorOrchestrator.displayName = 'EditorOrchestrator';

