import { defineConfig } from 'vitest/config';

export default defineConfig({
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
