import { expect, test } from 'vitest';
import { useWorkspaceStore } from './slices/workspaceSlice';
import { useFileTreeStore } from './slices/filetreeSlice';
import { useEditorStore } from './slices/editorSlice';
import { useStatusStore } from './slices/statusSlice';

test('Workspace State', () => {
  const store = useWorkspaceStore.getState();
  expect(store.currentPath).toBe(null);

  useWorkspaceStore.getState().setWorkspacePath('/test/path');
  expect(useWorkspaceStore.getState().currentPath).toBe('/test/path');

  useWorkspaceStore.getState().openFile('file1.txt');
  expect(useWorkspaceStore.getState().openFiles).toContain('file1.txt');
  expect(useWorkspaceStore.getState().activeFile).toBe('file1.txt');
});

test('FileTree State', () => {
  const store = useFileTreeStore.getState();
  expect(store.nodes).toEqual([]);

  useFileTreeStore.getState().expandNode('folder1');
  expect(useFileTreeStore.getState().expandedPaths.has('folder1')).toBe(true);
});

test('Editor State', () => {
  useEditorStore.getState().initializeFile('file1.txt', 'Hello');
  const fileState = useEditorStore.getState().fileStates['file1.txt'];
  expect(fileState.content).toBe('Hello');
  expect(fileState.isDirty).toBe(false);

  useEditorStore.getState().updateFileContent('file1.txt', 'World');
  const updatedState = useEditorStore.getState().fileStates['file1.txt'];
  expect(updatedState.content).toBe('World');
  expect(updatedState.isDirty).toBe(true);
});

test('Status State', () => {
  expect(useStatusStore.getState().status).toBe('idle');

  useStatusStore.getState().setStatus('loading', 'Loading...');
  expect(useStatusStore.getState().status).toBe('loading');
  expect(useStatusStore.getState().message).toBe('Loading...');
});
