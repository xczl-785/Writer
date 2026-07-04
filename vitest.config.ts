import { defineConfig } from 'vitest/config';

const dedupeEditorPackages = [
  '@tiptap/core',
  '@tiptap/extension-highlight',
  '@tiptap/extension-image',
  '@tiptap/extension-list',
  '@tiptap/extension-table',
  '@tiptap/extension-table-cell',
  '@tiptap/extension-table-header',
  '@tiptap/extension-table-row',
  '@tiptap/markdown',
  '@tiptap/pm',
  '@tiptap/react',
  '@tiptap/starter-kit',
  'orderedmap',
  'prosemirror-model',
  'prosemirror-state',
  'prosemirror-transform',
  'prosemirror-view',
];

export default defineConfig({
  resolve: {
    dedupe: dedupeEditorPackages,
  },
  test: {
    environment: 'jsdom',
    include: [
      'spike/**/*.test.ts',
      'src/**/*.test.ts',
      'src-tauri/QuickWriteTauriConfigBehavior.test.ts',
      'src-tauri/src/MenuWorkspaceItemsBehavior.test.ts',
      'src-tauri/src/QuickWriteNativeMenuBehavior.test.ts',
      'src-tauri/src/QuickWriteWindowCommandBehavior.test.ts',
    ],
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
});
