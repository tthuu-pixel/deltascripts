import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    // Prebundle worker dependencies before the first import, avoiding a Vite reload mid-upload.
    optimizeDeps: { include: ['jszip', '@xmldom/xmldom'] },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      proxy: { '/api': process.env.API_PROXY_TARGET || 'http://127.0.0.1:3001' },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/katex/')) return 'math';
            if (id.includes('node_modules/@google/genai/')) return 'gemini';
            if (id.includes('node_modules/jszip/')) return 'word';
          },
        },
      },
    },
  };
});
