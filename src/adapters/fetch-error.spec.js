import { describe, test, expect } from 'vitest'
import FetchError from './fetch-error.js'

describe('FetchError', () => {
  test('names the host and the status', () => {
    const error = new FetchError(403, 'https://world.hey.com/dhh/feed.atom')

    expect(error.status).toEqual(403)
    expect(error.message).toContain('world.hey.com')
    expect(error.message).toContain('403')
    expect(error instanceof Error).toBe(true)
  })

  test('survives a url it cannot parse', () => {
    expect(new FetchError(500, 'not a url').message).toContain('500')
  })
})
