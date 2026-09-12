import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

// `DISABLE_HMR=true` (used by AI Studio / low-CPU sandboxes) turns off HMR and
// file watching so agent edits do not cause flickering reloads.
const disableHmr = process.env.DISABLE_HMR === 'true';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    // Client bundle. The Express server bundle is built separately by esbuild
    // into dist-server/ (see package.json → build:server) so it is never
    // exposed as a static file.
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1600,
  },
  server: {
    host: '0.0.0.0',
    // Allow proxied preview hosts (dev sandboxes / containers / Render previews).
    allowedHosts: true as const,
    hmr: !disableHmr,
    watch: disableHmr ? null : {},
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: true as const,
  },
});
