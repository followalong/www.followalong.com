import { describe, test, expect, vi } from 'vitest'
import Queries from './index.js'

const queries = new Queries({})
const entry = (content) => ({ data: { 'content:encoded': content } })

describe('excerptForEntry', () => {
  test('takes the first two sentences as plain text', () => {
    expect(queries.excerptForEntry(entry('<p>One thing. <b>Two</b> things. Three things.</p>')))
      .toEqual('One thing. Two things.')
  })

  test('reads the same places the full content comes from', () => {
    expect(queries.excerptForEntry({ data: { description: 'From a description.' } }))
      .toEqual('From a description.')
  })

  test('has nothing to say about an entry with no body', () => {
    expect(queries.excerptForEntry({ data: {} })).toEqual('')
  })

  test('turns the entities a feed writes back into characters', () => {
    expect(queries.excerptForEntry(entry('<p>Bed &amp; breakfast &#8212; nice.</p>')))
      .toEqual('Bed & breakfast — nice.')
  })

  test('cuts a long first sentence on a word', () => {
    const long = `<p>${'word '.repeat(60)}end.</p>`
    const out = queries.excerptForEntry(entry(long))

    expect(out.length).toBeLessThanOrEqual(201)
    expect(out).toMatch(/…$/)
    expect(out).not.toMatch(/wor…$/)
  })

  // The card renders this as text, so the risk is not injection: it is that a
  // feed's stylesheet or its analytics snippet reads as the entry's opening
  // line. Stripping tags alone leaves exactly that behind.
  test('drops what is inside a script rather than just its tags', () => {
    expect(queries.excerptForEntry(entry('<script>var tracker = 1;</script><p>The actual words.</p>')))
      .toEqual('The actual words.')
  })

  test('drops what is inside a style rather than just its tags', () => {
    expect(queries.excerptForEntry(entry('<style>.a{color:red}</style><p>The actual words.</p>')))
      .toEqual('The actual words.')
  })

  test('drops a script that shouts its closing tag', () => {
    expect(queries.excerptForEntry(entry('<SCRIPT>bad()</SCRIPT><p>Good.</p>')))
      .toEqual('Good.')
  })

  // The whole reason this exists. Sanitising built a detached DOM tree per
  // entry, and a feed page did it once per card before anyone had read a word.
  test('builds no DOM', () => {
    const build = vi.spyOn(document, 'createElement')

    queries.excerptForEntry(entry('<p>Some words here. And more of them.</p>'))

    expect(build).not.toHaveBeenCalled()
    build.mockRestore()
  })
})

describe('hasContentForEntry', () => {
  test('says so when there is a body to read', () => {
    expect(queries.hasContentForEntry(entry('<p>Words.</p>'))).toEqual(true)
  })

  test('says so when there is not', () => {
    expect(queries.hasContentForEntry({ data: {} })).toEqual(false)
  })

  test('builds no DOM either, because every card asks', () => {
    const build = vi.spyOn(document, 'createElement')

    queries.hasContentForEntry(entry('<p>Words.</p>'))

    expect(build).not.toHaveBeenCalled()
    build.mockRestore()
  })
})
