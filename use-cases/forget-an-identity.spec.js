import { mountApp, describe, test } from './helper.js'
import localForage from 'localforage'

describe('Forget an identity', () => {
  let app
  let identity

  beforeEach(async () => {
    app = await mountApp()
    identity = app.vm.identity

    await app.click('[aria-label="Settings"]')
    await app.click('[aria-label="Forget identity"]')
  })

  test('removes the identity', () => {
    expect(app.vm.state.identities.length).toEqual(1)
  })

  test('seeds a new identity', () => {
    expect(app.vm.state.identities[0].id).not.toEqual(identity.id)
  })

  test('removes the feeds and entries', () => {
    expect(app.vm.state.feeds.length).toEqual(1) /* newly seeded */
    expect(app.vm.state.entries.length).toEqual(1) /* newly seeded */
  })

  test('redirects back to the home page', () => {
    expect(app.find('[aria-label="Page title"]').text()).toEqual('Welcome home!')
  })

  test('removes the identity from the config database', async () => {
    const db = localForage.createInstance({ name: 'follow-along' })
    const keys = await db.keys()

    expect(keys).not.toContain(identity.id)
  })

  test('removes the database for the identity', async () => {
    const db = localForage.createInstance({ name: `follow-along-${identity.id}` })
    const keys = await db.keys()

    expect(keys).toEqual([])
  })
})
