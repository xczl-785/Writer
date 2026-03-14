import React from 'react';
import { useWorkspaceStore } from '../state/slices/workspaceSlice';
import { useFileTreeStore } from '../state/slices/filetreeSlice';
import { useEditorStore } from '../state/slices/editorSlice';
import { useStatusStore } from '../state/slices/statusSlice';

export const StateDebug: React.FC = () => {
  const workspace = useWorkspaceStore();
  const filetree = useFileTreeStore();
  const editor = useEditorStore();
  const status = useStatusStore();

  return (
    <div
      style={{
        padding: '20px',
        border: '1px solid #ccc',
        marginTop: '20px',
        fontFamily: 'monospace',
      }}
    >
      <h2>State Debug</h2>

      <section style={{ marginBottom: '20px' }}>
        <h3>Workspace</h3>
        <div>Path: {workspace.folders[0]?.path || 'None'}</div>
        <div>Active: {workspace.activeFile || 'None'}</div>
        <div>Open Files: {workspace.openFiles.join(', ')}</div>
        <div style={{ marginTop: '10px' }}>
          <button onClick={() => workspace.addFolder({ path: '/test/path', index: 1 })}>
            Add Test Path
          </button>
          <button
            onClick={() => workspace.openFile('file1.txt')}
            style={{ marginLeft: '10px' }}
          >
            Open file1.txt
          </button>
          <button
            onClick={() => workspace.closeFile('file1.txt')}
            style={{ marginLeft: '10px' }}
          >
            Close file1.txt
          </button>
        </div>
      </section>

      <section style={{ marginBottom: '20px' }}>
        <h3>File Tree</h3>
        <div>Expanded: {Array.from(filetree.expandedPaths).join(', ')}</div>
        <div style={{ marginTop: '10px' }}>
          <button onClick={() => filetree.expandNode('folder1')}>
            Expand folder1
          </button>
          <button
            onClick={() => filetree.collapseNode('folder1')}
            style={{ marginLeft: '10px' }}
          >
            Collapse folder1
          </button>
        </div>
      </section>

      <section style={{ marginBottom: '20px' }}>
        <h3>Editor</h3>
        <pre style={{ background: '#f5f5f5', padding: '10px' }}>
          {JSON.stringify(editor.fileStates, null, 2)}
        </pre>
        <div style={{ marginTop: '10px' }}>
          <button
            onClick={() => editor.initializeFile('file1.txt', 'Hello World')}
          >
            Init file1.txt
          </button>
          <button
            onClick={() =>
              editor.updateFileContent('file1.txt', 'Hello World Updated')
            }
            style={{ marginLeft: '10px' }}
          >
            Update file1.txt
          </button>
        </div>
      </section>

      <section>
        <h3>Status</h3>
        <div>Status: {status.status}</div>
        <div>Message: {status.message || '-'}</div>
        <div style={{ marginTop: '10px' }}>
          <button
            onClick={() => status.setStatus('loading', 'Loading files...')}
          >
            Set Loading
          </button>
          <button
            onClick={() => status.setStatus('idle')}
            style={{ marginLeft: '10px' }}
          >
            Set Idle
          </button>
        </div>
      </section>
    </div>
  );
};
