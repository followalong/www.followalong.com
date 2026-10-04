#!/bin/sh
# probe.js runs inside the webview, where nothing can assert on it. This runs it twice in
# node under a stand-in page with one localStorage between the runs, the way two launches
# of the app share one, and checks the lines the localStorage questions produce.
set -e
here=$(cd "$(dirname "$0")" && pwd)

node - "$here/src-tauri/src/probe.js" <<'JS'
const fs = require('fs')
const src = fs.readFileSync(process.argv[2], 'utf8')
const assert = require('assert')

const stored = new Map()
const localStorage = {
  getItem: (k) => (stored.has(k) ? stored.get(k) : null),
  setItem: (k, v) => stored.set(k, String(v)),
  removeItem: (k) => stored.delete(k),
  key: (i) => Array.from(stored.keys())[i],
  get length () { return stored.size }
}
const element = { style: {}, remove () {}, click () {}, getBoundingClientRect: () => ({ left: 0, width: 0, right: 0 }), innerText: 'Save a copy  Saved' }
Object.assign(globalThis, {
  window: globalThis,
  location: { origin: 'probe://test' },
  isSecureContext: true,
  localStorage,
  innerWidth: 1, innerHeight: 1, devicePixelRatio: 1,
  open: () => null,
  getComputedStyle: () => ({}),
  document: { createElement: () => element, body: { appendChild () {} }, querySelector: () => element }
})

const run = (script = src.replace('__PROBE_SAVE__', '')) => new Promise((resolve) => {
  globalThis.fetch = (url) => {
    if (url.startsWith('probe://')) resolve(decodeURIComponent(url.split('report=')[1]).split('\n'))
    return Promise.resolve({ status: 0 })
  }
  // eslint-disable-next-line no-eval
  eval(script)
})
const line = (lines, key) => (lines.find((l) => l.startsWith(key + '=')) || assert.fail(`no ${key}= line in\n${lines.join('\n')}`)).slice(key.length + 1)

;(async () => {
  stored.set('follow-along/id-1/runs', '[{"at":1}]')
  const first = await run()
  assert.strictEqual(line(first, 'localStorage'), 'ok')
  assert.strictEqual(line(first, 'localStorageFromLastLaunch'), 'none')
  assert.match(line(first, 'notes'), /^follow-along\/id-1\/runs=\[\{"at":1\}\]$/)

  const second = await run()
  assert.strictEqual(line(second, 'localStorageFromLastLaunch'), line(first, 'localStorageThisLaunch'))
  assert.ok(!stored.has('probe/ping'), 'the round-trip key is cleaned up')

  // The Mac save lines appear only when probe.rs names a mode, and carry the command's answer.
  assert.ok(!second.some((l) => l.startsWith('saveFile=')), 'no save line without a mode')
  const invoked = []
  globalThis.__TAURI__ = { core: { invoke: (name, args) => { invoked.push([name, args]); return Promise.resolve(name === 'save_file') } } }
  const saving = await run(src.replace('__PROBE_SAVE__', 'dir'))
  assert.strictEqual(line(saving, 'saveFile'), 'true')
  assert.strictEqual(line(saving, 'savePage'), 'Save a copy Saved')
  assert.deepStrictEqual(invoked.find(([name]) => name === 'save_file'), ['save_file', { name: 'probe.followalong', text: 'probe copy' }])
  console.log('probe: ok')
})().catch((e) => { console.error(e.message); process.exit(1) })
JS
