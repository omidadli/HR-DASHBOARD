import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      /**
       * Older Safari/iOS is the single biggest source of "the site does not
       * open" reports. pdf.js 6 and parts of the dependency graph call
       * Promise.withResolvers / structuredClone / Object.hasOwn / Array.at /
       * findLast, none of which exist on iOS < 15.4 (withResolvers needs 17.4).
       * Vite only transpiles *syntax*, never built-ins, so those calls throw a
       * TypeError at runtime and the user sees a blank page.
       *
       * modernPolyfills injects the missing core-js built-ins into the modern
       * bundle. renderLegacyChunks stays off: the CSS (Tailwind v4) needs
       * Safari 16.4+ anyway, so shipping a SystemJS bundle for iOS 12 would
       * only produce a working-but-unstyled app — index.html shows a readable
       * "please update" message instead.
       */
      legacy({
        renderLegacyChunks: false,
        modernTargets: ['safari >= 14', 'ios_saf >= 14', 'chrome >= 80'],
        modernPolyfills: true,
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // Explicit, and low enough that esbuild down-levels syntax for iOS 14.
      target: ['es2020', 'safari14'],
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          // pdf.js / recharts are only needed deep inside a session; keeping
          // them out of the entry chunk makes the first paint much faster on
          // mobile networks.
          manualChunks(id) {
            if (id.includes('node_modules/pdfjs-dist')) return 'pdfjs';
            if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) return 'charts';
            if (id.includes('node_modules/mammoth') || id.includes('node_modules/jszip')) return 'docs';
            if (
              id.includes('node_modules/react') ||
              id.includes('node_modules/scheduler') ||
              id.includes('node_modules/lucide-react')
            ) {
              return 'react';
            }
          },
        },
      },
    },
    server: {
      host: '0.0.0.0',
      // Allow proxied preview hosts (dev sandboxes / containers).
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
