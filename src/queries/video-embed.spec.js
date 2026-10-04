import fs from 'fs'
import path from 'path'
import { describe, test, expect, afterEach } from 'vitest'
import Queries from './index.js'
import { PUBLIC_URL } from './public-url.js'

const queries = new Queries({})
const video = { data: { id: 'yt:video:dQw4w9WgXcQ' } }

describe('videoForEntry for a YouTube entry', () => {
  afterEach(() => { delete window.__TAURI__ })

  test('frames YouTube directly in a browser, where the site is the referrer', () => {
    expect(queries.videoForEntry(video))
      .toEqual('https://www.youtube.com/embed/dQw4w9WgXcQ?&rel=0&modestbranding=1&playsinline=1')
  })

  // tauri://localhost is no referrer YouTube accepts: it answers "Video
  // player configuration error 153". The site's own page frames it instead.
  test('frames the wrapper page on the public site in a native build', () => {
    window.__TAURI__ = {}

    expect(PUBLIC_URL).toEqual('https://www.followalong.com')
    expect(queries.videoForEntry(video)).toEqual(`${PUBLIC_URL}/watch.html?v=dQw4w9WgXcQ`)
  })

  test('leaves every other video address alone in a native build', () => {
    window.__TAURI__ = {}

    expect(queries.videoForEntry({ data: { link: 'https://example.com/a.mp4' } }))
      .toEqual('https://example.com/a.mp4')
  })
})

describe('public/watch.html', () => {
  const html = fs.readFileSync(path.resolve(__dirname, '../../public/watch.html'), 'utf8')
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])

  const open = (search) => {
    const page = document.implementation.createHTMLDocument('')

    // eslint-disable-next-line no-new-func
    new Function('location', 'document', scripts[0])({ search }, page)

    return page.querySelectorAll('iframe')
  }

  test('frames the video with the parameters the app uses', () => {
    const frames = open('?v=dQw4w9WgXcQ')

    expect(frames.length).toEqual(1)
    expect(frames[0].getAttribute('src'))
      .toEqual('https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1&playsinline=1')
    expect(frames[0].getAttribute('allow'))
      .toEqual('accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share')
    expect(frames[0].hasAttribute('allowfullscreen')).toEqual(true)
    expect(frames[0].getAttribute('referrerpolicy')).toEqual('strict-origin-when-cross-origin')
  })

  test.each([
    ['no id', ''],
    ['an empty id', '?v='],
    ['a short id', '?v=abc123xyz'],
    ['a long id', '?v=dQw4w9WgXcQQ'],
    ['a path', '?v=../../watch'],
    ['a query of its own', '?v=dQw4w9WgX%3Fa'],
    ['markup', '?v=%22%3E%3Cscript%3E'],
    ['an address', '?v=https://evil.example']
  ])('renders nothing for %s', (name, search) => {
    expect(open(search).length).toEqual(0)
  })

  test('carries one script, nothing from anywhere else, and no service worker', () => {
    expect(scripts.length).toEqual(1)
    expect(html).not.toMatch(/<script[^>]+src=|<link|serviceWorker|@import|url\(/)
    expect(html.match(/https?:\/\/[^'"\s]+/g)).toEqual(['https://www.youtube.com/embed/'])
  })
})
