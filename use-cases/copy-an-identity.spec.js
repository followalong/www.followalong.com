import { mountApp, describe, story, vi } from './helper.js'

const seed = `
  0/identities/abc123/create/v2.1 {"name":"My Account"}
  1/signals/134/create/v2.1 {"data":{"title":"Home","permalink":"home","order":"0"}}
  2/addons/777/configure/v2.1 {"type":"CORSAnywhere","data":{"url":"https://proxy.example/"}}
  3/feeds/543/create/v2.1 {"url":"https://foo.bar/rss.xml","data":{"title":"Feed title"}}
  4/entries/keep/create/v2.1 {"feedId":"543","data":{"guid":"1","title":"Kept entry"}}
  5/entries/drop/create/v2.1 {"feedId":"543","data":{"guid":"2","title":"Ordinary entry"}}
  6/entries/keep/save/v2.1
`

describe('Copy an identity', () => {
  let app
  let copyToClipboard

  const copied = () => copyToClipboard.mock.calls[0][0]

  beforeEach(async () => {
    copyToClipboard = vi.fn()

    app = await mountApp({
      copyToClipboard,
      state: { abc123: { config: {}, data: seed } }
    })

    await app.click('[aria-label="You"]')
    await app.click('[aria-label="Copy identity"]')
  })

  story('brings the identity, its feeds, signals and add-ons', () => {
    expect(copied()).toContain('identities/abc123/create')
    expect(copied()).toContain('feeds/543/create')
    expect(copied()).toContain('signals/134/create')
    expect(copied()).toContain('addons/777/configure')
  })

  story('brings the entries that were saved', () => {
    expect(copied()).toContain('entries/keep/create')
    expect(copied()).toContain('entries/keep/save')
  })

  story('leaves the rest of the entries behind', () => {
    expect(copied()).not.toContain('entries/drop')
  })

  story('is smaller than the full backup', async () => {
    const saveAs = vi.fn()
    const full = await mountApp({ saveAs, state: { abc123: { config: {}, data: seed } } })

    await full.click('[aria-label="You"]')
    await full.click('[aria-label="Export identity"]')

    expect(saveAs.mock.calls[0][0]).toContain('entries/drop')
    expect(copied().length).toBeLessThan(saveAs.mock.calls[0][0].length)
  })
})
