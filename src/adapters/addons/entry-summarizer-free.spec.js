import { describe, test, expect } from 'vitest'
import EntrySummarizer from './entry-summarizer-free.js'

// Content long enough to clear the 100-character guard but with nothing the
// sentence matcher recognises as a terminator.
const RUN_ON = 'a title with no terminating punctuation at all that simply keeps going well past one hundred characters'

const summarizer = () => new EntrySummarizer({}, { id: 'x' })

const meta = (content) => summarizer().entryMeta({}, { contentForEntry: () => content })

describe('EntrySummarizer#entryMeta', () => {
  test('summarizes content that has sentences', () => {
    const content = 'Kittens purr loudly. Kittens purr when content. Puppies bark instead of purring. Kittens remain the better animal overall.'

    expect(meta(content).content).toContain('<strong>')
  })

  test('returns nothing for content with no sentence terminators', () => {
    expect(RUN_ON.length).toBeGreaterThan(100)
    expect(meta(RUN_ON)).toBeUndefined()
  })

  test('returns nothing for short content', () => {
    expect(meta('Too short.')).toBeUndefined()
  })
})
