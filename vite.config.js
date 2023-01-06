import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      injectRegister: 'auto'
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
