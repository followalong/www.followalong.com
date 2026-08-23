import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import tailwind from './tailwind.config.js'

const CHROME = tailwind.theme.extend.colors.chrome.DEFAULT

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['img/icons/**/*'],
      manifest: {
        name: 'Follow Along',
        short_name: 'Follow Along',
        description: 'Follow the people and communities you care about.',
        // The bar's colour, so the browser chrome and the app agree.
        theme_color: CHROME,
        background_color: CHROME,
        display: 'standalone',
        start_url: '/',
        scope: '/',
        lang: 'en',
        icons: [
          {
            src: '/img/icons/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/img/icons/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            // The mark sits inside the safe circle and the background is
            // full-bleed, so the same art survives being masked.
            src: '/img/icons/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/img/icons/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,jpeg,jpg,png,svg}']
      }
    })
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test-setup.js'],
    // Worktrees live under .claude/worktrees and carry their own copies of
    // these specs, so running the suite here would also run whatever old code
    // another worktree sits on. Relative on purpose: a glob matching .claude
    // anywhere in the path would exclude a worktree's own specs when the suite
    // is run from inside it.
    exclude: ['**/node_modules/**', '**/dist/**', '.claude/worktrees/**'],
    coverage: {
      exclude: ['use-cases/*']
    }
  }
})
