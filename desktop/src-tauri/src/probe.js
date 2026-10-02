// Evaluated in the webview by probe.rs. Reads facts about the webview and the feed proxy,
// and hands them back through the probe:// scheme.
(async () => {
  const out = []
  const ok = (k, v) => out.push(k + '=' + v)
  const tried = async (k, f) => { try { ok(k, await f()) } catch (e) { ok(k, 'ERR:' + e.name + ':' + e.message) } }

  ok('origin', location.origin)
  ok('isSecureContext', window.isSecureContext)
  await tried('indexedDB', async () => (await indexedDB.databases()).map((d) => d.name).join(','))
  await tried('cacheStorage', async () => { const c = await caches.open('probe'); await c.put('/probe', new Response('x')); return !!(await c.match('/probe')) })
  await tried('serviceWorker', async () => !!(await navigator.serviceWorker.register('/sw.js')))
  // The proxy answers 403 to an origin that is not on its list, and feeds stop there.
  await tried('proxy', async () => (await fetch('https://cors-anywhere.followalong.com/https://changelog.followalong.com/feed.xml')).status)
  await tried('windowOpen', async () => { const w = open('about:blank', '_blank'); if (w) w.close(); return w === null ? 'null' : 'opened' })
  ok('viewport', innerWidth + 'x' + innerHeight + ' dpr=' + devicePixelRatio)
  await tried('safeArea', async () => {
    const d = document.createElement('div')
    d.style.cssText = 'position:fixed;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)'
    document.body.appendChild(d)
    const p = getComputedStyle(d)
    const insets = [p.paddingTop, p.paddingRight, p.paddingBottom, p.paddingLeft].join('|')
    d.remove()
    return insets
  })
  // The app is one phone-wide column: in a wide window the gaps either side must match.
  await tried('column', async () => ['main', 'header', 'nav'].map((q) => {
    const r = document.querySelector(q).getBoundingClientRect()
    return q + ' ' + Math.round(r.left) + '+' + Math.round(r.width) + '+' + Math.round(innerWidth - r.right)
  }).join(' | '))
  ok('rendered', (document.querySelector('#app').innerText || '').replace(/\s+/g, ' ').trim().slice(0, 200))
  await fetch('probe://localhost/?report=' + encodeURIComponent(out.join('\n')))
})()
