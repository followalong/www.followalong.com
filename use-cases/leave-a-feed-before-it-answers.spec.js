import { mountApp, describe, story } from './helper.js'

const SLOW = 'https://slow.example.com/feed.xml'
const FAST = 'https://fast.example.com/feed.xml'

const feed = (title, entryTitle) => {
  return `<feed><title>${title}</title><entry><id>${entryTitle}</id><title>${entryTitle}</title></entry></feed>`
}

// The feed route is one record, so walking from one feed to another reuses the
// same component. A request started for the first one is still in flight, and
// what it resolves with has to be dropped rather than rendered under the
// second one's name.
describe('Leave a feed before it answers', () => {
  let app
  let answerSlow

  beforeEach(async () => {
    app = await mountApp({
      path: `/${SLOW}`,
      fetch: (url) => {
        if (`${url}`.indexOf('slow') !== -1) {
          return new Promise((resolve) => { answerSlow = resolve })
        }

        return Promise.resolve({ status: 200, body: feed('Fast feed', 'Fast entry') })
      }
    })

    app.vm.$router.push(`/${FAST}`)
    await app.wait()

    answerSlow({ status: 200, body: feed('Slow feed', 'Slow entry') })
    await app.wait()
  })

  story('keeps showing the feed that was asked for last', () => {
    expect(app.text()).toContain('Fast entry')
  })

  story('never shows the abandoned feed’s entries', () => {
    expect(app.text()).not.toContain('Slow entry')
  })
})
