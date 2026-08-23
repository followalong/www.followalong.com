import { mountApp, describe, story } from './helper.js'

const seed = `
  0/identities/abc123/create/v2.1 {"name":"My Account"}
  1/signals/134/create/v2.1 {"data":{"title":"Home","permalink":"home","order":"0"}}
  2/feeds/543/create/v2.1 {"url":"https://foo.bar/rss.xml","data":{"title":"Feed title"}}
  3/entries/pod/create/v2.1 {"feedId":"543","data":{"guid":"pod","title":"An episode","link":"https://foo.bar/ep14.mp3"}}
  4/entries/clip/create/v2.1 {"feedId":"543","data":{"guid":"clip","title":"A clip","link":"https://foo.bar/clip.mp4"}}
  5/entries/tube/create/v2.1 {"feedId":"543","data":{"guid":"tube","id":"yt:video:abc123xyz","title":"A youtube video"}}
`

describe('Play audio and video', () => {
  let app

  beforeEach(async () => {
    app = await mountApp({ state: { abc123: { config: {}, data: seed } } })
  })

  story('gives an audio entry a real player in the card', () => {
    expect(app.findAll('audio').length).toBeGreaterThan(0)
    expect(app.find('audio source').attributes('src')).toEqual('https://foo.bar/ep14.mp3')
  })

  story('gives a video entry a play lead rather than an inline player', () => {
    expect(app.findAll('[data-media-lead]').length).toBeGreaterThan(0)
    expect(app.find('[data-pip]').exists()).toEqual(false)
  })

  describe('Starting a video', () => {
    beforeEach(async () => {
      await app.click('[data-media-lead]')
    })

    story('opens the picture-in-picture window', () => {
      expect(app.find('[data-pip]').exists()).toEqual(true)
    })

    story('plays the file directly when it is one', () => {
      expect(app.find('[data-pip] video').attributes('src')).toEqual('https://foo.bar/clip.mp4')
    })

    story('keeps playing across a page change', async () => {
      await app.click('[aria-label="You"]')

      expect(app.find('[data-pip]').exists()).toEqual(true)
    })

    story('can be closed', async () => {
      await app.click('[data-pip-close]')

      expect(app.find('[data-pip]').exists()).toEqual(false)
    })
  })

  describe('Starting a YouTube video', () => {
    beforeEach(async () => {
      const entry = app.vm.queries.entriesForIdentity(app.vm.identity)
        .find((e) => app.vm.queries.titleForEntry(e) === 'A youtube video')

      app.vm.play(entry)
      await app.wait()
    })

    story('embeds it rather than trying to play the page', () => {
      expect(app.find('[data-pip] iframe').attributes('src')).toContain('youtube.com/embed/abc123xyz')
    })
  })
})
