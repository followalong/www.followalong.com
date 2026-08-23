import { mountApp, describe, test, event } from './helper.js'

describe('Roll up an identity', () => {
  let app

  beforeEach(async () => {
    app = await mountApp()

    await app.click('[aria-label="You"]')
    await app.click('[aria-label="Roll up identity"]')
  })

  test('replaces the events with a projection', () => {
    expect(app.vm.state.events.length).toEqual(1)
  })

  test('redirects back to the home page', () => {
    expect(app.find('[aria-label="Page title"]').text()).toEqual('Follow Along')
  })

  test('preserves the entries', async () => {
    await app.vm.$router.push('/signals/read')
    await app.wait()

    expect(app.find('[aria-label="Entry title"]').text()).toEqual('Twitter is done. Long live RSS.')
  })

  test('preserves the signals', async () => {
    await app.vm.$router.push('/signals/read')
    await app.wait()

    expect(app.find('[aria-label="Page title"]').text()).toEqual('Read')
  })

  test('preserves the feeds', async () => {
    await app.click('[aria-label="Feeds"]')
    await app.click('[aria-label="Visit Changelog feed"]')

    expect(app.find('[aria-label="Page title"]').text()).toEqual('Changelog')
  })

  event('identities.rollup', {
    data: {
      identity: {}
      // entries: [], should be pruned
      // signals: []
    }
  }, () => { return { app } })
})
