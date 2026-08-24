import { mountApp, describe, responses, story, event } from './helper.js'

describe('Fetch a feed now', () => {
  const feed = { id: '543', title: 'Feed Title', url: 'https://foo.bar/feed.xml' }

  let app

  beforeEach(async () => {
    app = await mountApp({
      path: `/${feed.url}`,
      fetch: responses([
        `<feed><title>${feed.title}</title><entry><id>1</id><title>First</title></entry></feed>`,
        `<feed><title>${feed.title}</title><entry><id>1</id><title>First</title></entry><entry><id>2</id><title>Second</title></entry></feed>`
      ]),
      state: {
        abc123: {
          config: {},
          data: `
            0/identities/abc123/create/v2.1
            1/feeds/${feed.id}/create/v2.1 {"url":"${feed.url}","data":{"title":"${feed.title}"}}
          `
        }
      }
    })
  })

  story('has only what the page arrived with', () => {
    expect(app.text()).toContain('First')
    expect(app.text()).not.toContain('Second')
  })

  story('goes and asks again on demand', async () => {
    await app.click('[aria-label="Feed menu"]')
    await app.click('[aria-label="Fetch feed"]')

    expect(app.text()).toContain('Second')
    expect(app.text()).not.toContain('show now')
  })

  // The whole point of asking by hand is a feed that has stopped answering,
  // and a feed in backoff is exactly that one. Nothing here may consult it.
  story('asks a feed that is in backoff', async () => {
    const identity = app.vm.queries.allIdentities()[0]

    app.vm.state.track(identity.id, 'feeds', feed.id, 'fetchFailed', { count: 6, status: 500 })
    await app.wait()

    await app.click('[aria-label="Feed menu"]')
    await app.click('[aria-label="Fetch feed"]')

    expect(app.text()).toContain('Second')
  })

  event('feeds.fetched', {
    objectId: feed.id
  }, () => { return { app } })
})
