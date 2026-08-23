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
    // Worktrees live under .claude and carry their own copies of these specs.
    // Without this, running the suite here also runs whatever old code another
    // worktree happens to be sitting on.
    exclude: ['**/node_modules/**', '**/dist/**', '**/.claude/**'],
    coverage: {
      exclude: ['use-cases/*']
    }
  }
})
