import { describe, test, expect } from 'vitest'
import feedsFromOpml from './opml.js'

const wrap = (body) => `<?xml version="1.0"?><opml version="2.0"><body>${body}</body></opml>`

describe('feedsFromOpml', () => {
  test('flattens folders, however deep', () => {
    const feeds = feedsFromOpml(wrap(`
      <outline text="Top">
        <outline text="Inner">
          <outline type="rss" text="Deep" xmlUrl="https://a.example/deep.xml"/>
        </outline>
        <outline type="rss" text="Shallow" xmlUrl="https://a.example/shallow.xml"/>
      </outline>
      <outline type="rss" text="Unfiled" xmlUrl="https://a.example/unfiled.xml"/>`))

    expect(feeds.map((f) => f.url)).toEqual([
      'https://a.example/deep.xml',
      'https://a.example/shallow.xml',
      'https://a.example/unfiled.xml'
    ])
  })

  test('titles from title, then text, then the URL', () => {
    const feeds = feedsFromOpml(wrap(`
      <outline title="Titled" text="Texted" xmlUrl="https://a.example/1.xml"/>
      <outline text="Texted" xmlUrl="https://a.example/2.xml"/>
      <outline xmlUrl="https://a.example/3.xml"/>`))

    expect(feeds.map((f) => f.title)).toEqual(['Titled', 'Texted', 'https://a.example/3.xml'])
  })

  test('decodes entities in attributes', () => {
    const feeds = feedsFromOpml(wrap('<outline title="Tom &amp; Jerry" xmlUrl="https://a.example/?a=1&amp;b=2"/>'))

    expect(feeds).toEqual([{ title: 'Tom & Jerry', url: 'https://a.example/?a=1&b=2' }])
  })

  test('refuses anything without an outline that points at a feed', () => {
    const refused = 'That does not look like an OPML file.'

    expect(() => feedsFromOpml('just some notes')).toThrow(refused)
    expect(() => feedsFromOpml('')).toThrow(refused)
    expect(() => feedsFromOpml(wrap('<outline text="A folder"/>'))).toThrow(refused)
  })
})
