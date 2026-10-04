// Evaluated in the webview by probe.rs. Reads facts about the webview and the feed proxy,
// and hands them back through the probe:// scheme.
(async () => {
  const products = '__PROBE_PRODUCTS__'.split(',').filter(Boolean)
  const save = '__PROBE_SAVE__'
  const out = []
  const ok = (k, v) => out.push(k + '=' + v)
  const tried = async (k, f) => { try { ok(k, await f()) } catch (e) { ok(k, 'ERR:' + e.name + ':' + e.message) } }

  const until = async (f, ms = 6000) => { for (let t = 0; t < ms; t += 100) { const v = f(); if (v) return v; await new Promise((resolve) => setTimeout(resolve, 100)) } }
  // The Mac open panel (PROBE_PANELS). Clicked before anything is awaited, while the script's
  // own user gesture stands; probe.rs has set the panel to end, and the input then says cancel.
  let chooser
  if (save === 'panels') {
    const i = document.createElement('input')
    i.type = 'file'
    document.body.appendChild(i)
    chooser = Promise.race([
      new Promise((resolve) => i.addEventListener('cancel', () => resolve('opened and ended (cancel event)'))),
      new Promise((resolve) => setTimeout(() => resolve('no cancel event in 6 s'), 6000))
    ])
    i.click()
    ok('fileInputPanel', await chooser)
    i.remove()
  }

  ok('origin', location.origin)
  ok('isSecureContext', window.isSecureContext)
  await tried('indexedDB', async () => (await indexedDB.databases()).map((d) => d.name).join(','))
  // The restart diagnostic keeps its runs list here (a store "note"), written as the page
  // goes, so it must both work now and still be there at the next launch.
  await tried('localStorage', async () => { localStorage.setItem('probe/ping', 'pong'); const v = localStorage.getItem('probe/ping'); localStorage.removeItem('probe/ping'); return v === 'pong' ? 'ok' : 'read back ' + v })
  await tried('localStorageFromLastLaunch', async () => localStorage.getItem('probe/launch') || 'none')
  await tried('localStorageThisLaunch', async () => { const now = new Date().toISOString(); localStorage.setItem('probe/launch', now); return now })
  // The app's notes, as stored: `follow-along/<identity id>/runs` is the restart list itself.
  await tried('notes', async () => {
    const keys = []
    for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i))
    return keys.filter((k) => k.startsWith('follow-along/')).sort().map((k) => k + '=' + localStorage.getItem(k).slice(0, 400)).join(' ; ') || 'none'
  })
  await tried('cacheStorage', async () => { const c = await caches.open('probe'); await c.put('/probe', new Response('x')); return !!(await c.match('/probe')) })
  await tried('serviceWorker', async () => !!(await navigator.serviceWorker.register('/sw.js')))
  // The proxy answers 403 to an origin that is not on its list, and feeds stop there.
  await tried('proxy', async () => (await fetch('https://cors-anywhere.followalong.com/https://changelog.followalong.com/feed.xml')).status)
  await tried('windowOpen', async () => { const w = open('about:blank', '_blank'); if (w) w.close(); return w === null ? 'null' : 'opened' })
  // Saving a copy of an identity as a file: a download link does nothing here, so the page
  // needs the share sheet. Asked for both names, because a browser may refuse an extension.
  await tried('canShareFile', async () => ['copy.followalong', 'copy.txt'].map((name) => {
    const can = navigator.canShare ? navigator.canShare({ files: [new File(['x'], name, { type: 'text/plain' })] }) : 'no canShare'
    return name + ':' + can
  }).join(',') + ' share:' + typeof navigator.share)
  // Opening one: whether a file input opens a picker cannot be asked without a tap.
  await tried('fileInput', async () => { const i = document.createElement('input'); i.type = 'file'; return i.type + ' files:' + (i.files ? i.files.length : 'none') + ' File.text:' + typeof File.prototype.text })
  ok('viewport', innerWidth + 'x' + innerHeight + ' dpr=' + devicePixelRatio)
  // What could put a margin beside the column or shrink the type: a gutter, a zoom, an inset.
  await tried('layout', async () => {
    const box = (q) => { const r = document.querySelector(q).getBoundingClientRect(); return q + ' ' + [r.left, r.top, r.width, r.height].map(Math.round).join(',') }
    const bar = getComputedStyle(document.querySelector('header'))
    return 'inner ' + innerWidth + 'x' + innerHeight + ' outer ' + outerWidth + 'x' + outerHeight + ' client ' + document.documentElement.clientWidth +
      ' visualViewport ' + visualViewport.scale + '@' + visualViewport.width + ' zoom ' + getComputedStyle(document.documentElement).zoom +
      ' fontSize ' + getComputedStyle(document.body).fontSize + ' | ' + ['html', 'body', '#app', 'header', 'main', 'nav'].map(box).join(' | ') +
      ' | header padding ' + bar.paddingTop + ' ' + bar.paddingLeft
  })
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
  // The iOS build only: the StoreKit plugin's global script puts this object in place.
  const storekit = window.__TAURI__ && window.__TAURI__.storekit
  ok('storekit', storekit ? Object.keys(storekit).sort().join(',') : 'absent')
  // Answers [] with no store behind it: a purchase needs the test environment (ios-storekit.test.sh).
  if (storekit && products.length) await tried('products', async () => JSON.stringify(await storekit.products(products)))
  // Links into the app, as the page saw them (probe.rs listens from the first script on).
  ok('openUrlEvents', JSON.stringify(window.__probeOpenUrls || []))
  // Both native builds: the page opens the Mac checkout page through this command.
  await tried('openUrl', async () => { await window.__TAURI__.core.invoke('open_url', { url: 'probe://localhost/open_url' }); return 'invoked' })
  // The Mac build only: save_file. With PROBE_SAVE_DIR the shell writes there with no panel;
  // with PROBE_PANELS the real panel opens and is ended, which the command answers as a cancel.
  if (save === 'panels') await window.__TAURI__.core.invoke('abort_modal')
  if (save) await tried('saveFile', async () => window.__TAURI__.core.invoke('save_file', { name: 'probe.followalong', text: 'probe copy' }))
  // The page's own path: the You page's row, the sheet's button, then what the row says.
  if (save === 'dir') {
    await tried('savePage', async () => {
      const q = (label) => document.querySelector('[aria-label="' + label + '"]')
      document.querySelector('a[href="/settings"]').click()
      ;(await until(() => q('Save identity to a file'))).click()
      ;(await until(() => q('Save the file'))).click()
      await until(() => /Saved/.test(q('Save identity to a file').innerText))
      return q('Save identity to a file').innerText.replace(/\s+/g, ' ').trim()
    })
  }
  ok('rendered', (document.querySelector('#app').innerText || '').replace(/\s+/g, ' ').trim().slice(0, 200))
  await fetch('probe://localhost/?report=' + encodeURIComponent(out.join('\n')))
})()
