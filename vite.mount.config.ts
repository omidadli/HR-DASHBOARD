import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

/**
 * Builds scripts/mount-entry.tsx into a single ESM bundle that the jsdom smoke
 * test (scripts/run-mount.mjs) can import inside a fake DOM. Kept separate from
 * the production build so the shipped config stays untouched.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {alias: {'@': path.resolve(__dirname, '.')}},
  logLevel: 'warn',
  build: {
    outDir: 'dist-mount',
    emptyOutDir: true,
    minify: false,
    cssCodeSplit: false,
    lib: {
      entry: path.resolve(__dirname, 'scripts/mount-entry.tsx'),
      formats: ['es'],
      fileName: () => 'mount-entry.js',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime'],
    },
  },
});
