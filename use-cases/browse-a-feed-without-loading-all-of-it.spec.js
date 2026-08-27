import { mountApp, describe, story } from './helper.js'

// A feed page and the feeds list both render every row they have. On a phone
// that is the whole feed's artwork and every episode's player at once, and the
// device pays for all of it before anyone has scrolled to any of it.
const FEEDS = 40
const EPISODES = 40

const seed = () => {
  const lines = [
    '0/identities/abc123/create/v2.1 {"name":"My Account"}',
    '1/signals/134/create/v2.1 {"data":{"title":"Home","permalink":"home","order":"0"}}'
  ]
  let seq = 2

  for (let f = 0; f < FEEDS; f++) {
    lines.push(`${seq++}/feeds/f${f}/create/v2.1 ${JSON.stringify({
      url: `https://foo.bar/${f}.xml`,
      data: { title: `Feed ${f}`, image: { url: `https://foo.bar/art${f}.png` } }
    })}`)
  }

  for (let e = 0; e < EPISODES; e++) {
    lines.push(`${seq++}/entries/pod${e}/create/v2.1 ${JSON.stringify({
      feedId: 'f0',
      data: { guid: `pod${e}`, title: `Episode ${e}`, link: `https://foo.bar/ep${e}.mp3` }
    })}`)
    lines.push(`${seq++}/entries/clip${e}/create/v2.1 ${JSON.stringify({
      feedId: 'f1',
      data: { guid: `clip${e}`, title: `Clip ${e}`, link: `https://foo.bar/clip${e}.mp4`, 'media:thumbnail': { '@_url': `https://foo.bar/thumb${e}.jpg` } }
    })}`)
  }

  return lines.join('\n')
}

describe('Browse a feed without loading all of it', () => {
  let app

  beforeEach(async () => {
    app = await mountApp({
      fetch: () => Promise.resolve({ status: 304, body: '' }),
      state: { abc123: { config: {}, data: seed() } }
    })
  })

  describe('The feeds list', () => {
    beforeEach(async () => {
      app.vm.$router.push('/following')
      await app.wait()
    })

    story('leaves every feed’s artwork until it is scrolled to', () => {
      const logos = app.findAll('[aria-label^="Visit"] img')

      expect(logos.length).toEqual(FEEDS)
      logos.forEach(($img) => {
        expect($img.attributes('loading')).toEqual('lazy')
        expect($img.attributes('decoding')).toEqual('async')
      })
    })
  })

  describe('A podcast feed', () => {
    beforeEach(async () => {
      app.vm.$router.push('/https://foo.bar/0.xml')
      await app.wait()
    })

    // Every player here is a real media element on the device. Left to its
    // default the browser fetches each one's headers on sight, so opening a
    // feed starts as many downloads as it has episodes.
    story('asks for no audio until someone presses play', () => {
      const players = app.findAll('audio')

      expect(players.length).toEqual(EPISODES)
      players.forEach(($audio) => {
        expect($audio.attributes('preload')).toEqual('none')
      })
    })
  })

  describe('A video feed', () => {
    beforeEach(async () => {
      app.vm.$router.push('/https://foo.bar/1.xml')
      await app.wait()
    })

    story('leaves every thumbnail until it is scrolled to', () => {
      const posters = app.findAll('[data-media-lead] img')

      expect(posters.length).toEqual(EPISODES)
      posters.forEach(($img) => {
        expect($img.attributes('loading')).toEqual('lazy')
        expect($img.attributes('src')).toContain('thumb')
      })
    })
  })
})
