import { mountApp, describe, story, vi } from './helper.js'

describe('Change how an identity is encrypted', () => {
  let app
  let prompt

  const keychainName = `keychain-${Math.random()}`

  beforeEach(async () => {
    prompt = vi.fn().mockReturnValue('hunter2')

    app = await mountApp({
      prompt,
      keychainName,
      state: {
        abc123: {
          config: {},
          data: '0/identities/abc123/create/v2.1 {"name":"My Account"}'
        }
      }
    })

    await app.click('[aria-label="You"]')
  })

  story('starts unencrypted', () => {
    expect(app.text()).toContain('Not encrypted')
  })

  describe('Choosing to be asked for a password', () => {
    beforeEach(async () => {
      await app.click('[aria-label="Change encryption"]')
      await app.click('[aria-label="Encrypt with ask"]')
    })

    story('asks for the password once', () => {
      expect(prompt).toHaveBeenCalledTimes(1)
    })

    story('remembers the choice', async () => {
      const strategy = await app.vm.commands.keychain.getStrategy(app.vm.identity.id)

      expect(strategy).toEqual('ask')
    })
  })

  describe('Choosing to store the password', () => {
    beforeEach(async () => {
      await app.click('[aria-label="Change encryption"]')
      await app.click('[aria-label="Encrypt with store"]')
    })

    story('keeps the key on the device', async () => {
      const strategy = await app.vm.commands.keychain.getStrategy(app.vm.identity.id)

      expect(strategy).toEqual('store')
      expect(await app.vm.commands.keychain.getKey(app.vm.identity.id)).toEqual('hunter2')
    })
  })
})
