import { describe, test, expect } from 'vitest'
import buildFetch from './fetch.js'
import FetchError from './fetch-error.js'

const response = ({ status = 200, body = '<rss/>', headers = {} }) => ({
  ok: status >= 200 && status < 300,
  status,
  text: () => Promise.resolve(body),
  headers: { get: (name) => headers[name.toLowerCase()] ?? null }
})

const fetchWith = (impl) => buildFetch(impl)

describe('fetch', () => {
  test('resolves the body of a good response', async () => {
    const fetch = fetchWith(() => Promise.resolve(response({ body: '<rss>hi</rss>' })))

    expect(await fetch('https://a.example/feed')).toMatchObject({ status: 200, body: '<rss>hi</rss>' })
  })

  test('rejects an error status rather than returning its body', async () => {
    const fetch = fetchWith(() => Promise.resolve(response({ status: 403, body: '' })))

    await expect(fetch('https://world.hey.com/dhh/feed.atom')).rejects.toThrow(FetchError)
    await expect(fetch('https://world.hey.com/dhh/feed.atom')).rejects.toThrow('403')
  })

  test('returns the validators a conditional request needs next time', async () => {
    const fetch = fetchWith(() => Promise.resolve(response({
      headers: { etag: '"abc"', 'last-modified': 'Mon, 01 May 2023 00:00:00 GMT' }
    })))

    expect(await fetch('https://a.example/feed')).toMatchObject({
      etag: '"abc"',
      lastModified: 'Mon, 01 May 2023 00:00:00 GMT'
    })
  })

  test('treats 304 as success with no body', async () => {
    const fetch = fetchWith(() => Promise.resolve(response({ status: 304, body: '' })))

    expect(await fetch('https://a.example/feed')).toMatchObject({ status: 304, body: '' })
  })

  test('sends the conditional headers it is given', async () => {
    let seen = null
    const fetch = fetchWith((url, options) => {
      seen = options
      return Promise.resolve(response({}))
    })

    await fetch('https://a.example/feed', { etag: '"abc"', lastModified: 'Mon, 01 May 2023 00:00:00 GMT' })

    expect(seen.headers['If-None-Match']).toEqual('"abc"')
    expect(seen.headers['If-Modified-Since']).toEqual('Mon, 01 May 2023 00:00:00 GMT')
  })

  test('sends no conditional headers without validators', async () => {
    let seen = null
    const fetch = fetchWith((url, options) => {
      seen = options
      return Promise.resolve(response({}))
    })

    await fetch('https://a.example/feed')

    expect(seen.headers).toEqual({})
  })
})
