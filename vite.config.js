import fs from 'fs'
import path from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import tailwind from './tailwind.config.js'

const CHROME = tailwind.theme.extend.colors.chrome.DEFAULT

// A feed link carries the feed's URL in the path — /https://example.com/feed.xml
// — so its last segment usually ends in .xml, .rss or .json. Vite's own SPA
// fallback refuses to rewrite any path with a dot in the last segment, on the
// assumption that it must name a file, so opening a feed link cold answered 404
// and the browser showed nothing. Published hosts answer unknown paths with the
// app (that is what dist/404.html is for); dev and preview have to do the same
// or they are not serving the same app.
const wantsThePage = (req) => {
  return (req.method === 'GET' || req.method === 'HEAD') &&
    `${req.headers.accept || ''}`.includes('text/html')
}

const serveAppForDeepLinks = () => {
  let distDir

  const onDisk = (url) => {
    try {
      const file = path.resolve(distDir, `.${decodeURI(`${url}`.split('?')[0])}`)

      return file.startsWith(distDir) && fs.existsSync(file) && fs.statSync(file).isFile()
    } catch (e) {
      return false
    }
  }

  return {
    name: 'serve-app-for-deep-links',

    configResolved (config) {
      distDir = path.resolve(config.root, config.build.outDir)
    },

    // Returning a function defers this until after everything that serves a
    // real file has passed, and still ahead of the one that renders index.html.
    configureServer (server) {
      return () => {
        server.middlewares.use((req, res, next) => {
          if (wantsThePage(req)) req.url = '/index.html'

          next()
        })
      }
    },

    // Preview serves dist/ straight off disk and this runs first, so it has to
    // decide for itself whether there is a file to serve.
    configurePreviewServer (server) {
      server.middlewares.use((req, res, next) => {
        if (wantsThePage(req) && !onDisk(req.url)) req.url = '/index.html'

        next()
      })
    }
  }
}

export default defineConfig({
  plugins: [
    vue(),
    serveAppForDeepLinks(),
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
