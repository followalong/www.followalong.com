// Hands the reader a file to keep, and answers whether it left: false when
// the reader backs out. A download link does nothing in a native webview, so
// the Mac app asks its shell for the save panel (the Mac share sheet has no
// save), and a phone and the iPhone app get the share sheet (Save to Files,
// AirDrop). Everything else gets a download.
//
// text/plain, whatever the name ends in: the share sheet and Files treat the
// file as a plain document, and no app claims the extension.
const TYPE = 'text/plain'

const shares = (file) => {
  const handheld = window.__TAURI__ || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)

  return !!(handheld && navigator.canShare && navigator.canShare({ files: [file] }))
}

const CANNOT = 'This app cannot save a file on this device. Use Copy this identity instead.'

// The native build without the StoreKit plugin, which only the iPhone app has.
const macApp = () => !!(window.__TAURI__ && !window.__TAURI__.storekit)

const download = (file) => {
  const link = document.createElement('a')

  link.href = URL.createObjectURL(file)
  link.download = file.name
  document.body.appendChild(link)
  link.click()
  link.remove()

  setTimeout(() => URL.revokeObjectURL(link.href), 60000)
}

export default (name, text) => {
  if (macApp()) {
    return window.__TAURI__.core.invoke('save_file', { name, text }).then((saved) => !!saved, () => {
      throw new Error(CANNOT)
    })
  }

  const file = new File([text], name, { type: TYPE })

  if (shares(file)) {
    return navigator.share({ files: [file] }).then(() => true, (e) => {
      if (e && e.name === 'AbortError') return false

      throw new Error('This device could not share the file. Use Copy this identity instead.')
    })
  }

  if (window.__TAURI__) {
    return Promise.reject(new Error(CANNOT))
  }

  download(file)

  return Promise.resolve(true)
}
