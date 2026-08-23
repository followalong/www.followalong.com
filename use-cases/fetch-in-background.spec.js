import { mountApp, describe, test, responses, vi } from './helper.js'

describe('Fetch in background', () => {
  test('only stores feeds and entries that change', async () => {
    const app = await mountApp({
      fetch: responses([
        '<feed><title>Feed title</title><entry><id>123</id><title>Entry title</title></entry></feed>',
        '<feed><title>Feed title</title><entry><id>123</id><title>Entry title</title></entry></feed>'
      ]),
      state: {
        abc123: {
          config: {},
          data: `
            0/identities/abc123/create/v2.1
            1/signals/signal-1/create/v2.1 {"data":{"title":"Home","permalink":"home","order":"0"}}
            2/feeds/feed-1/create/v2.1 {"id":"123","url":"http://foo.bar/rss.xml"}
          `
        }
      }
    })
    const originalEventsLength = app.vm.state.events.length

    app.vm.commands.fetchOutdatedFeeds(app.vm.identity)
    await app.wait()

    expect(app.vm.state.events.length).toEqual(originalEventsLength + 3) // one for the entry, one for the feed, one recording the fetch
  })
})

describe('Fetch in background: feeds that cannot be fetched', () => {
  const seed = `
    0/identities/abc123/create/v2.1
    1/signals/signal-1/create/v2.1 {"data":{"title":"Home","permalink":"home","order":"0"}}
    2/feeds/no-url/create/v2.1 {"data":{"title":"Has no url"}}
    3/feeds/fine/create/v2.1 {"url":"http://foo.bar/rss.xml","data":{"title":"Fine"}}
  `

  test('skips a feed with no url instead of asking the proxy for nothing', async () => {
    const fetch = responses(['<feed><title>Fine</title></feed>'])
    const app = await mountApp({ fetch, state: { abc123: { config: {}, data: seed } } })

    fetch.mockClear()

    const fetching = app.vm.commands.fetchFeedsForIdentity(app.vm.identity)
    for (let i = 0; i < 10; i++) await app.wait()
    await fetching

    expect(fetch.mock.calls.length).toEqual(1)
    expect(fetch.mock.calls[0][0]).toContain('foo.bar')
  })

  test('a failing feed neither rejects nor stops the ones after it', async () => {
    const rejections = []
    const onRejection = (e) => { rejections.push(e); e.preventDefault && e.preventDefault() }
    window.addEventListener('unhandledrejection', onRejection)

    // Keyed on the url rather than call order, so an extra call cannot make
    // the mock run dry and fail for the wrong reason.
    const fetch = vi.fn((url) => {
      return `${url}`.indexOf('broken.example') !== -1
        ? Promise.reject(new Error('network is down'))
        : Promise.resolve({ status: 200, body: '<feed><title>Fine</title></feed>' })
    })

    const app = await mountApp({
      fetch,
      state: {
        abc123: {
          config: {},
          data: `
            0/identities/abc123/create/v2.1
            1/signals/signal-1/create/v2.1 {"data":{"title":"Home","permalink":"home","order":"0"}}
            2/feeds/broken/create/v2.1 {"url":"http://broken.example/rss.xml","data":{"title":"Broken"}}
            3/feeds/fine/create/v2.1 {"url":"http://foo.bar/rss.xml","data":{"title":"Fine"}}
          `
        }
      }
    })

    fetch.mockClear()

    const fetching = app.vm.commands.fetchFeedsForIdentity(app.vm.identity)
    for (let i = 0; i < 10; i++) await app.wait()
    await fetching

    expect(fetch.mock.calls.length).toEqual(2)
    expect(rejections.length).toEqual(0)

    window.removeEventListener('unhandledrejection', onRejection)
  })
})
