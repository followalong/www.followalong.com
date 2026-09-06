// Keeps the screen on while something is playing.
//
// The browser takes a screen lock back the moment the page is hidden, and it
// does not hand it back when the page returns. So holding one is not a single
// request: it is a standing wish, plus asking again every time the page comes
// back. Without that second half this looks fine until someone switches apps
// mid-episode, and then the screen sleeps and iOS suspends the app.
//
// More than one thing can want the screen at once: a feed page runs a podcast
// card while a video window is opened and closed over it. So the wish is a set
// of who is asking rather than a flag, and the screen is handed back when the
// last of them has let go. Asking and letting go are both idempotent, because
// a player that never started still releases on the way out.
//
// Everything here fails soft. The API is absent on older browsers and refuses
// outright in low power mode or on a page that is not visible, and none of
// that is worth interrupting playback over.
class WakeLock {
  constructor ({ navigator, document } = {}) {
    this._navigator = navigator
    this._document = document
    this._sentinel = null
    this._owners = new Set()

    if (this._document) {
      this._document.addEventListener('visibilitychange', () => this._onVisibilityChange())
    }
  }

  hold (owner) {
    this._owners.add(owner)

    return this._ask()
  }

  release (owner) {
    this._owners.delete(owner)

    if (this._wanted()) return Promise.resolve()

    return this._letGo()
  }

  _wanted () {
    return this._owners.size > 0
  }

  _onVisibilityChange () {
    if (!this._wanted() || this._document.visibilityState !== 'visible') return

    return this._ask()
  }

  _ask () {
    const api = this._navigator && this._navigator.wakeLock

    if (!api || this._sentinel) return Promise.resolve()

    return Promise.resolve()
      .then(() => api.request('screen'))
      .then((sentinel) => {
        // Nothing is playing any more: the answer arrived after the question
        // stopped mattering, so give it straight back rather than leaving the
        // screen on for a player that has gone.
        if (!this._wanted()) return Promise.resolve(sentinel.release()).catch(() => {})

        this._sentinel = sentinel

        sentinel.addEventListener('release', () => { this._sentinel = null })
      })
      .catch(() => { this._sentinel = null })
  }

  _letGo () {
    const sentinel = this._sentinel

    this._sentinel = null

    if (!sentinel) return Promise.resolve()

    return Promise.resolve(sentinel.release()).catch(() => {})
  }
}

export default WakeLock
