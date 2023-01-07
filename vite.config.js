import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      name: 'Follow Along',
      themeColor: '#005B7C',
      msTileColor: '#FBF7F0',
      appleMobileWebAppCapable: 'yes',
      iconPaths: {
        favicon32: 'img/icons/favicon-32x32.png',
        favicon16: 'img/icons/favicon-16x16.png',
        appleTouchIcon: 'img/icons/apple-touch-icon.png',
        maskIcon: 'img/icons/safari-pinned-tab.svg',
        msTileImage: 'img/icons/msapplication-icon-144x144.png'
      },
      registerType: 'autoUpdate'
    })
  ],
  test: {
    globals: true,
    environment: 'happy-dom',
    coverage: {
      exclude: ['use-cases/*']
    }
  }
})
