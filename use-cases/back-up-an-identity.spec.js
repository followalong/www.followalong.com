import { mountApp, describe, story, vi } from './helper.js'

describe('Back up an identity', () => {
  let app
  let saveAs
  let copyToClipboard

  beforeEach(async () => {
    saveAs = vi.fn()
    copyToClipboard = vi.fn()

    app = await mountApp({
      saveAs,
      copyToClipboard,
      state: {
        abc123: {
          config: {},
          data: `
            0/identities/abc123/create/v2.1 {"name":"My Account"}
            1/feeds/543/create/v2.1 {"url":"https://foo.bar/rss.xml","data":{"title":"Feed title"}}
          `
        }
      }
    })

    await app.click('[aria-label="You"]')
  })

  story('downloads the whole event log as a file', async () => {
    await app.click('[aria-label="Export identity"]')

    expect(saveAs).toHaveBeenCalledTimes(1)

    const [contents, filename] = saveAs.mock.calls[0]

    expect(filename).toContain('abc123')
    expect(contents).toContain('identities/abc123/create')
    expect(contents).toContain('feeds/543/create')
  })

  story('copies the same log to the clipboard', async () => {
    await app.click('[aria-label="Copy identity"]')

    expect(copyToClipboard).toHaveBeenCalledTimes(1)
    expect(copyToClipboard.mock.calls[0][0]).toContain('identities/abc123/create')
  })
})
