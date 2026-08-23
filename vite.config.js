import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      icons: [
        {
          src: './public/img/icons/apple-touch-icon.png',
          sizes: '180x180',
          type: 'image/png'
        },
        {
          src: './public/img/icons/favicon.ico',
          sizes: '48x48',
          type: 'image/vnd.microsoft.icon'
        },
        {
          src: './src/assets/imgs/logo-white.svg',
          type: 'image/svg+xml'
        },
        {
          src: './src/assets/imgs/logo-mobile.svg',
          type: 'image/svg+xml'
        }
      ],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,jpeg,jpg,png,svg}']
      }
    })
  ],
  test: {
    globals: true,
    environment: 'jsdom',
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
