import { mountApp, describe, story, vi } from './helper.js'

const BACKUP = `0/identities/imported9/create/v2.1 {"name":"Imported"}
1/feeds/999/create/v2.1 {"url":"https://imported.example/rss.xml","data":{"title":"Imported feed"}}`

describe('Restore from a backup', () => {
  let app

  const upload = async (text, name = 'follow-along.abc.log') => {
    await app.click('[aria-label="Restore backup"]')

    const input = app.find('[aria-label="Backup file"]')

    Object.defineProperty(input.element, 'files', {
      value: [new File([text], name, { type: 'text/plain' })],
      configurable: true
    })

    await input.trigger('change')
    await app.wait()
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

  story('takes the file the app hands out', async () => {
    await upload(BACKUP)

    expect(app.vm.queries.allIdentities().map((i) => i.id)).toContain('imported9')
  })

  story('brings the feeds with it', async () => {
    await upload(BACKUP)

    const imported = app.vm.queries.allIdentities().find((i) => i.id === 'imported9')

    expect(app.vm.queries.feedsForIdentity(imported)).toHaveLength(1)
  })

  story('refuses a backup that is already here', async () => {
    await upload('0/identities/abc123/create/v2.1 {"name":"My Account"}')

    expect(app.text()).toContain('already')
    expect(app.vm.queries.allIdentities()).toHaveLength(1)
  })

  story('refuses a file that is not a backup', async () => {
    await upload('just some notes')

    expect(app.text()).toContain('does not look like')
    expect(app.vm.queries.allIdentities()).toHaveLength(1)
  })

  story('round-trips what Download a copy produced', async () => {
    const saveAs = vi.fn()

    // The store key has to be the identity's own id, or the export finds no
    // events to write.
    const exporter = await mountApp({
      saveAs,
      state: { roundtrip: { config: {}, data: BACKUP.replace('imported9', 'roundtrip') } }
    })

    await exporter.click('[aria-label="You"]')
    await exporter.click('[aria-label="Export identity"]')

    const [contents] = saveAs.mock.calls[0]

    await upload(contents)

    expect(app.vm.queries.allIdentities().map((i) => i.id)).toContain('roundtrip')
  })
})
