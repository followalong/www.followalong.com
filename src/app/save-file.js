// Hands the reader a file to keep, and answers whether it left: false when
// the reader backs out of the share sheet. A phone and the native builds get
// the share sheet (Save to Files, AirDrop), because a download link does
// nothing in the native webview. Everything else gets a download.
//
// text/plain, whatever the name ends in: the share sheet and Files treat the
// file as a plain document, and no app claims the extension.
const TYPE = 'text/plain'

const shares = (file) => {
  const handheld = window.__TAURI__ || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)

  return !!(handheld && navigator.canShare && navigator.canShare({ files: [file] }))
}

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
  const file = new File([text], name, { type: TYPE })

  if (shares(file)) {
    return navigator.share({ files: [file] }).then(() => true, (e) => {
      if (e && e.name === 'AbortError') return false

      throw new Error('This device could not share the file. Use Copy this identity instead.')
    })
  }

  if (window.__TAURI__) {
    return Promise.reject(new Error('This app cannot save a file on this device. Use Copy this identity instead.'))
  }

  download(file)

  return Promise.resolve(true)
}
