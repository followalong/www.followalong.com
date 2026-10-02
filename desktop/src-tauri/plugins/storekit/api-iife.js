// Injected after tauri's own bundle defines window.__TAURI__, which a plugin js_init_script is
// not: those run first. The page detects the iOS build by this object alone.
if ('__TAURI__' in window) {
  // Swift rejects with { message } and Tauri's own refusals are bare strings. The page reads
  // e.message, so every failure becomes an Error.
  const invoke = (cmd, args) => window.__TAURI__.core.invoke('plugin:storekit|' + cmd, args)
    .catch((e) => { throw new Error((e && e.message) || String(e)) })
  Object.defineProperty(window.__TAURI__, 'storekit', {
    value: Object.freeze({
      products: async (ids) => invoke('products', { ids }),
      purchase: async (productId, appAccountToken) => invoke('purchase', { productId, appAccountToken }),
      entitlements: async () => invoke('entitlements'),
      manage: async () => invoke('manage')
    })
  })
}
