import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['spike/**/*.test.ts', 'src/**/*.test.ts'],
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
});
