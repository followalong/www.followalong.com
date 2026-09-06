import { describe, test, expect } from 'vitest'
import Queries from './index.js'

const queries = new Queries({})

// Through the real parser, because what the key has to survive is whatever
// fast-xml-parser makes of a feed, not a hand-written object.
const entryFrom = (xml) => {
  const doc = queries.jsonFromXml(xml)
  const entries = doc.entry || doc.item || []

  return { data: entries[0] }
}

const rssItem = (inner) => `<rss><channel><item><title>T</title>${inner}</item></channel></rss>`
const atomEntry = (inner) => `<feed><entry><title>T</title>${inner}</entry></feed>`

describe('keyForEntry', () => {
  test('takes an Atom id', () => {
    expect(queries.keyForEntry(entryFrom(atomEntry('<id>yt:video:abc</id>')))).toEqual('yt:video:abc')
  })

  test('takes a guid written as text', () => {
    expect(queries.keyForEntry(entryFrom(rssItem('<guid>https://a.example/1</guid>')))).toEqual('https://a.example/1')
  })

  test('takes a guid that carries attributes', () => {
    expect(queries.keyForEntry(entryFrom(rssItem('<guid isPermaLink="false">abc123</guid>')))).toEqual('abc123')
  })

  test('takes a link written as text', () => {
    expect(queries.keyForEntry(entryFrom(rssItem('<link>https://a.example/1</link>')))).toEqual('https://a.example/1')
  })

  // The parser names attributes @_href, so asking for link.href asked for
  // something no feed can produce and every Atom entry keyed only by its
  // link threw instead.
  test('takes the href off an Atom link', () => {
    expect(queries.keyForEntry(entryFrom(atomEntry('<link href="https://a.example/1"/>')))).toEqual('https://a.example/1')
  })

  // Atom entries normally carry several: alternate, self, replies.
  test('takes the href off the first of several links', () => {
    const entry = entryFrom(atomEntry('<link rel="alternate" href="https://a.example/1"/><link rel="self" href="https://a.example/1.atom"/>'))

    expect(queries.keyForEntry(entry)).toEqual('https://a.example/1')
  })

  test('prefers the alternate link to whatever comes first', () => {
    const entry = entryFrom(atomEntry('<link rel="self" href="https://a.example/1.atom"/><link rel="alternate" href="https://a.example/1"/>'))

    expect(queries.keyForEntry(entry)).toEqual('https://a.example/1')
  })

  // Nothing identifying at all, so fall back to what it says it is. Not
  // stable across an edited title, and better than losing the item.
  test('falls back to the title and date when a feed offers nothing else', () => {
    const entry = entryFrom(rssItem('<pubDate>Mon, 01 May 2023 00:00:00 GMT</pubDate>'))

    expect(queries.keyForEntry(entry)).toEqual('followalong:T|2023-05-01T00:00:00.000Z')
  })

  test('still refuses an entry with no title and no date either', () => {
    const bare = { data: queries.jsonFromXml('<rss><channel><item><description>nothing</description></item></channel></rss>').item[0] }

    expect(() => queries.keyForEntry(bare)).toThrow(/Cannot find a key/)
  })

  // The first four branches decide the key for every entry already stored.
  test('keeps a link-as-text behind a guid that carries attributes', () => {
    const entry = entryFrom(rssItem('<guid isPermaLink="false">abc123</guid><link>https://a.example/1</link>'))

    expect(queries.keyForEntry(entry)).toEqual('https://a.example/1')
  })
})
