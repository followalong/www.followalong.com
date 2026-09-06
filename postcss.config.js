// Every face the font packages ship declares woff2 and then woff. Nothing that
// can run this app is without woff2 — Safari has had it since 10, which is
// iOS 10 — so the fallback is bytes in every deploy that no browser will ask
// for. Dropping it here rather than by hand-writing the faces means a font
// added later is trimmed too, and there are no file paths to keep in step.
const WOFF_FALLBACK = /format\(['"]?woff['"]?\)/

const dropWoffFallback = () => ({
  postcssPlugin: 'drop-woff-fallback',
  Declaration: {
    src (decl) {
      const kept = decl.value
        .split(',')
        .filter((source) => !WOFF_FALLBACK.test(source))
        .join(',')
        .trim()

      if (kept && kept !== decl.value) decl.value = kept
    }
  }
})

dropWoffFallback.postcss = true

module.exports = {
  plugins: [
    require('tailwindcss'),
    require('autoprefixer'),
    dropWoffFallback
  ]
}
