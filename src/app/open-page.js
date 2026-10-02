// Opens a page of somebody else's (the checkout, the billing page) beside the
// app, and answers whether it opened: a blocker can refuse. In a native build
// window.open answers null, so the shell's own command hands the address to
// the system browser.
export default (url) => {
  if (window.__TAURI__) {
    window.__TAURI__.core.invoke('open_url', { url })

    return true
  }

  const opened = window.open(url, '_blank')

  if (opened) opened.opener = null

  return !!opened
}
