import { mountApp, describe, story, vi } from './helper.js'
import { encrypt, decrypt, isEncrypted } from '../src/queries/crypt.js'

const DATA = `0/identities/abc123/create/v2.1 {"name":"My Account"}
1/feeds/543/create/v2.1 {"url":"https://secret.example/rss.xml","data":{"title":"Secret feed"}}`

const rawValues = async (app) => {
  const db = app.vm.state._dbs[app.vm.identity.id]._db
  const values = []

  await db.iterate((value) => { values.push(`${value}`) })

  return values
}

describe('Encrypt the local log', () => {
  let app

  const keychainName = `keychain-${Math.random()}`

  beforeEach(async () => {
    app = await mountApp({
      prompt: vi.fn().mockReturnValue('hunter2'),
      keychainName,
      state: { abc123: { config: {}, data: DATA } }
    })
  })

  story('leaves the log readable while unencrypted', async () => {
    expect((await rawValues(app)).join(' ')).toContain('secret.example')
  })

  describe('Once a password is set', () => {
    beforeEach(async () => {
      await app.click('[aria-label="You"]')
      await app.click('[aria-label="Change encryption"]')
      await app.click('[aria-label="Encrypt with store"]')
      await app.vm.commands.state.rewriteAll(app.vm.identity.id)
    })

    story('rewrites what is already on disk', async () => {
      const raw = await rawValues(app)

      expect(raw.join(' ')).not.toContain('secret.example')
      expect(raw.every((v) => isEncrypted(v) || v === 'null')).toEqual(true)
    })

    story('keeps the app itself working', () => {
      expect(app.vm.queries.feedsForIdentity(app.vm.identity)).toHaveLength(1)
    })

    story('opens again with the right password', async () => {
      const opened = await Promise.all(
        (await rawValues(app)).filter(isEncrypted).map((v) => decrypt('hunter2')(v))
      )

      expect(opened.join(' ')).toContain('secret.example')
    })

    story('refuses the wrong password rather than returning nonsense', async () => {
      const one = (await rawValues(app)).find(isEncrypted)

      await expect(decrypt('wrong-password')(one)).rejects.toThrow('Could not decrypt')
    })

    story('refuses when no password is given at all', async () => {
      const one = (await rawValues(app)).find(isEncrypted)

      await expect(decrypt('')(one)).rejects.toThrow('encrypted')
    })
  })

  describe('The cipher itself', () => {
    story('round-trips a value', async () => {
      const sealed = await encrypt('hunter2')('the quick brown fox')

      expect(isEncrypted(sealed)).toEqual(true)
      expect(sealed).not.toContain('quick')
      expect(await decrypt('hunter2')(sealed)).toEqual('the quick brown fox')
    })

    story('never produces the same ciphertext twice', async () => {
      const sealer = encrypt('hunter2')

      expect(await sealer('same')).not.toEqual(await sealer('same'))
    })

    story('passes plaintext through when there is no password', async () => {
      expect(await encrypt('')('plain')).toEqual('plain')
      expect(await decrypt('')('plain')).toEqual('plain')
    })
  })
})
