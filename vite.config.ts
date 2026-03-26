import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const DEV_PORT = 43173;

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: DEV_PORT,
    strictPort: true,
  },
  build: {
    rollupOptions: {
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
