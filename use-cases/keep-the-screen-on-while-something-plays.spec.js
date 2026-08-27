import { mountApp, describe, story, vi } from './helper.js'

const seed = `
  0/identities/abc123/create/v2.1 {"name":"My Account"}
  1/signals/134/create/v2.1 {"data":{"title":"Home","permalink":"home","order":"0"}}
  2/feeds/543/create/v2.1 {"url":"https://foo.bar/rss.xml","data":{"title":"Feed title"}}
  3/entries/pod/create/v2.1 {"feedId":"543","data":{"guid":"pod","title":"An episode","link":"https://foo.bar/ep14.mp3"}}
  4/entries/clip/create/v2.1 {"feedId":"543","data":{"guid":"clip","title":"A clip","link":"https://foo.bar/clip.mp4"}}
  5/entries/tube/create/v2.1 {"feedId":"543","data":{"guid":"tube","id":"yt:video:abc123xyz","title":"A youtube video"}}
`

describe('Keep the screen on while something plays', () => {
  let app
  let wakeLock

  beforeEach(async () => {
    wakeLock = { hold: vi.fn().mockResolvedValue(), release: vi.fn().mockResolvedValue() }

    app = await mountApp({
      fetch: () => Promise.resolve({ status: 304, body: '' }),
      state: { abc123: { config: {}, data: seed } },
      wakeLock
    })

    app.vm.$router.push('/https://foo.bar/rss.xml')
    await app.wait()
  })

  story('leaves the screen alone until something plays', () => {
    expect(wakeLock.hold).not.toHaveBeenCalled()
  })

  describe('An episode', () => {
    beforeEach(async () => {
      await app.find('audio').trigger('play')
    })

    // iOS suspends a web app when the screen locks, which stops the audio.
    // Holding the screen on is the only thing the web gives us to stop that.
    story('keeps the screen on', () => {
      expect(wakeLock.hold).toHaveBeenCalled()
    })

    story('lets it sleep again when it is paused', async () => {
      await app.find('audio').trigger('pause')

      expect(wakeLock.release).toHaveBeenCalled()
    })

    story('lets it sleep again when it reaches the end', async () => {
      await app.find('audio').trigger('ended')

      expect(wakeLock.release).toHaveBeenCalled()
    })

    // The player goes with the page, and a lock nobody is holding leaves the
    // screen on for a podcast that stopped when the page did.
    story('lets it sleep again when the page goes', async () => {
      app.vm.$router.push('/following')
      await app.wait()

      expect(wakeLock.release).toHaveBeenCalled()
    })
  })

  describe('A video', () => {
    beforeEach(async () => {
      await app.click('[data-media-lead]')
    })

    story('keeps the screen on once it is actually playing', async () => {
      expect(wakeLock.hold).not.toHaveBeenCalled()

      await app.find('[data-pip] video').trigger('play')

      expect(wakeLock.hold).toHaveBeenCalled()
    })

    story('lets it sleep again when it is paused', async () => {
      await app.find('[data-pip] video').trigger('play')
      await app.find('[data-pip] video').trigger('pause')

      expect(wakeLock.release).toHaveBeenCalled()
    })

    story('lets it sleep again when the window is closed', async () => {
      await app.find('[data-pip] video').trigger('play')
      await app.click('[data-pip-close]')

      expect(wakeLock.release).toHaveBeenCalled()
    })
  })

  // A cross-origin embed says nothing about whether it is playing, so the
  // window being open is the only signal there is.
  describe('A YouTube video', () => {
    beforeEach(async () => {
      const entry = app.vm.queries.entriesForIdentity(app.vm.identity)
        .find((e) => app.vm.queries.titleForEntry(e) === 'A youtube video')

      app.vm.play(entry)
      await app.wait()
    })

    story('keeps the screen on while its window is open', () => {
      expect(wakeLock.hold).toHaveBeenCalled()
    })

    story('lets it sleep again when the window is closed', async () => {
      await app.click('[data-pip-close]')

      expect(wakeLock.release).toHaveBeenCalled()
    })
  })
})
