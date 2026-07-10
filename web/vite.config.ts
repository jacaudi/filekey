/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'generateSW',
      registerType: 'prompt', // new SW waits; UpdatePrompt (Task 4) drives the reload
      filename: 'sw.js', // pin the path: Go server no-stores exactly /sw.js
      includeAssets: ['logo.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'FileKey',
        short_name: 'FileKey',
        description:
          'Encrypt and share files securely with passkeys. Fully offline, ' +
          'easy-to-use, and zero-knowledge for ultimate file protection.',
        categories: ['utilities', 'security'],
        lang: 'en',
        dir: 'ltr',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#fff',
        theme_color: '#fff',
        // NOTE: no `screenshots` — none exist; add only when real captures land (follow-up).
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: '/icons/maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false, // prompt-driven update: SW skips waiting only on user Reload
        // (fold R5) OMIT navigateFallback entirely — workbox types it as `string`, so
        // `navigateFallback: null` is a strict-tsc error that fails `npm run build`
        // (vite.config.ts is under tsconfig.node.json). Omitting it means no default
        // navigation route; the NetworkFirst runtimeCaching route below handles navigations.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // antd bundle > workbox 2 MiB default
        runtimeCaching: [
          {
            // Same strategy as today's hand-rolled sw.js: HTML network-first so new
            // deploys are picked up immediately; offline falls back to the precached app.
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'fk-pages',
              networkTimeoutSeconds: 3,
              precacheFallback: { fallbackURL: 'index.html' },
            },
          },
          {
            // Same-origin statics not in the precache: cache-first (today's behavior).
            urlPattern: ({ url, request }) =>
              url.origin === self.location.origin && request.mode !== 'navigate',
            handler: 'CacheFirst',
            options: {
              cacheName: 'fk-static',
              expiration: { maxEntries: 64 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    fs: {
      allow: ['..'],
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}', 'scripts/**/*.test.mjs'],
    testTimeout: 30000,
    alias: {
      'virtual:pwa-register/react': new URL(
        './src/test/mocks/pwa-register-react.ts',
        import.meta.url,
      ).pathname,
    },
  },
});
