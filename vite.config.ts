import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';

const DEV_PORT = 43173;
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

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: dedupeEditorPackages,
  },
  server: {
    host: '127.0.0.1',
    port: DEV_PORT,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      input: {
        app: resolve(__dirname, 'index.html'),
        quickWrite: resolve(__dirname, 'quick-write.html'),
      },
      output: {
        manualChunks(id) {
          if (id.includes('/src/domains/editor/')) {
            return 'app-editor';
          }

          if (!id.includes('node_modules')) {
            return;
          }

          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/scheduler/')
          ) {
            return 'vendor-react';
          }

          if (
            id.includes('/@tiptap/') ||
            id.includes('/prosemirror-') ||
            id.includes('/markdown-it/')
          ) {
            return 'vendor-tiptap';
          }

          if (id.includes('/@tauri-apps/') || id.includes('/tauri-plugin-')) {
            return 'vendor-tauri';
          }

          if (id.includes('/lucide-react/')) {
            return 'vendor-icons';
          }
        },
      },
    },
  },
});
