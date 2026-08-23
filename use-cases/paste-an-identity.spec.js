import { mountApp, describe, story, vi } from './helper.js'

const COPY = `0/identities/imported9/create/v2.1 {"name":"Imported"}
1/feeds/999/create/v2.1 {"url":"https://imported.example/rss.xml","data":{"title":"Imported feed"}}`

describe('Paste an identity', () => {
  let app

  const paste = async (text) => {
    await app.click('[aria-label="Paste identity"]')
    await app.find('[aria-label="Identity to paste"]').setValue(text)
    await app.click('[aria-label="Restore identity"]')
  }

  beforeEach(async () => {
    app = await mountApp({
      state: {
        abc123: {
          config: {},
          data: '0/identities/abc123/create/v2.1 {"name":"My Account"}'
        }
      }
    })

    await app.click('[aria-label="You"]')
  })

  story('takes a copy made on another device', async () => {
    await paste(COPY)

    expect(app.vm.queries.allIdentities().map((i) => i.id)).toContain('imported9')
  })

  story('brings the feeds with it', async () => {
    await paste(COPY)

    const imported = app.vm.queries.allIdentities().find((i) => i.id === 'imported9')

    expect(app.vm.queries.feedsForIdentity(imported)).toHaveLength(1)
  })

  story('refuses an identity that is already here', async () => {
    await paste('0/identities/abc123/create/v2.1 {"name":"My Account"}')

    expect(app.text()).toContain('already')
    expect(app.vm.queries.allIdentities()).toHaveLength(1)
  })

  story('refuses text that is not an identity', async () => {
    await paste('just some notes')

    expect(app.text()).toContain('does not look like')
    expect(app.vm.queries.allIdentities()).toHaveLength(1)
  })

  story('round-trips what Copy this identity produced', async () => {
    const copyToClipboard = vi.fn()

    // The store key has to be the identity's own id, or the copy finds no
    // events to bring.
    const other = await mountApp({
      copyToClipboard,
      state: { roundtrip: { config: {}, data: COPY.replace('imported9', 'roundtrip') } }
    })

    await other.click('[aria-label="You"]')
    await other.click('[aria-label="Copy identity"]')

    await paste(copyToClipboard.mock.calls[0][0])

    expect(app.vm.queries.allIdentities().map((i) => i.id)).toContain('roundtrip')
  })
})
