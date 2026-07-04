import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/core/**/*.test.ts'],
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
});
