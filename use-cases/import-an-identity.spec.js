import { mountApp, describe, story } from './helper.js'

const BACKUP = `0/identities/imported9/create/v2.1 {"name":"Imported"}
1/feeds/999/create/v2.1 {"url":"https://imported.example/rss.xml","data":{"title":"Imported feed"}}`

describe('Import an identity', () => {
  let app

  const importText = async (text) => {
    await app.click('[aria-label="Import identity"]')
    await app.find('[aria-label="Identity backup"]').setValue(text)
    await app.submit('[aria-label="Import a backup"]')
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

  story('adds the identity from the backup', async () => {
    await importText(BACKUP)

    const ids = app.vm.queries.allIdentities().map((identity) => identity.id)

    expect(ids).toContain('imported9')
  })

  story('brings the feeds with it', async () => {
    await importText(BACKUP)

    const imported = app.vm.queries.allIdentities().find((i) => i.id === 'imported9')

    expect(app.vm.queries.feedsForIdentity(imported)).toHaveLength(1)
  })

  story('refuses a backup that is already here', async () => {
    await importText('0/identities/abc123/create/v2.1 {"name":"My Account"}')

    expect(app.text()).toContain('already')
    expect(app.vm.queries.allIdentities()).toHaveLength(1)
  })

  story('refuses something that is not a backup', async () => {
    await importText('hello there')

    expect(app.text()).toContain('does not look like')
    expect(app.vm.queries.allIdentities()).toHaveLength(1)
  })
})
