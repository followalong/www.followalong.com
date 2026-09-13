import { describe, test, expect } from 'vitest'
import Queries from './index.js'
import SORT_BY_FEED_TITLE from './sorters/sort-by-feed-title.js'

const queries = new Queries({})

// Through the real parser: with attributes kept, a title that carries one
// folds to an object, and that is the shape these readers have to survive.
const feedFrom = (xml) => ({ data: queries.jsonFromXml(xml) })
const entryFrom = (xml) => ({ data: queries.jsonFromXml(xml).entry[0] })

describe('titleForFeed', () => {
  test('reads a plain title', () => {
    expect(queries.titleForFeed(feedFrom('<feed><title>Hello</title></feed>'))).toEqual('Hello')
  })

  test('reads the text of a typed Atom title', () => {
    expect(queries.titleForFeed(feedFrom('<feed><title type="text">Hello</title></feed>'))).toEqual('Hello')
  })

  test('falls back to the url when a typed title is empty', () => {
    const feed = feedFrom('<feed><title type="text"></title></feed>')
    feed.url = 'https://a.example/feed'

    expect(queries.titleForFeed(feed)).toEqual('https://a.example/feed')
  })

  test('sorts typed titles by their text', () => {
    const feeds = [
      feedFrom('<feed><title type="text">zebra</title></feed>'),
      feedFrom('<feed><title>Apple</title></feed>')
    ]

    expect(feeds.sort(SORT_BY_FEED_TITLE(queries)).map((f) => queries.titleForFeed(f))).toEqual(['Apple', 'zebra'])
  })
})

describe('titleForEntry', () => {
  test('reads a plain title', () => {
    expect(queries.titleForEntry(entryFrom('<feed><entry><title>Hello</title></entry></feed>'))).toEqual('Hello')
  })

  test('reads the text of a typed Atom title', () => {
    expect(queries.titleForEntry(entryFrom('<feed><entry><title type="html">Hello</title></entry></feed>'))).toEqual('Hello')
  })

  test('has nothing for an entry without one', () => {
    expect(queries.titleForEntry(entryFrom('<feed><entry><id>1</id></entry></feed>'))).toBeFalsy()
  })
})
