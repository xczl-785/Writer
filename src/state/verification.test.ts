import { expect, test } from 'vitest';
import {
  useWorkspaceStore,
  getWorkspaceType,
} from '../domains/workspace/state/workspaceStore';
import { useFileTreeStore } from '../domains/file/state/fileStore';
import { useEditorStore } from '../domains/editor/state/editorStore';
import { useStatusStore } from './slices/statusSlice';
import { useSettingsStore } from '../domains/settings/state/settingsStore';

test('Workspace State', () => {
  const store = useWorkspaceStore.getState();
  // V6: folders[] 替代 currentPath
  expect(store.folders).toEqual([]);
  expect(store.workspaceFile).toBe(null);
  expect(store.isDirty).toBe(false);
  expect(getWorkspaceType(store)).toBe('empty');

  // 测试添加文件夹
  useWorkspaceStore.getState().addFolder({ path: '/test/path', index: 0 });
  expect(useWorkspaceStore.getState().folders.length).toBe(1);
  expect(getWorkspaceType(useWorkspaceStore.getState())).toBe('single');

  useWorkspaceStore.getState().openFile('file1.txt');
  expect(useWorkspaceStore.getState().openFiles).toContain('file1.txt');
  expect(useWorkspaceStore.getState().activeFile).toBe('file1.txt');
});

test('FileTree State', () => {
  const store = useFileTreeStore.getState();
  // V6: rootFolders[] 替代 nodes
  expect(store.rootFolders).toEqual([]);
  expect(store.expandedPaths.size).toBe(0);

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

test('Settings State', () => {
  expect(useSettingsStore.getState().localePreference).toBeDefined();
  useSettingsStore.getState().setTypewriterEnabledByUser(true);
  expect(useSettingsStore.getState().typewriterEnabledByUser).toBe(true);
});
