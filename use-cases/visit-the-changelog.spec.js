import { mountApp, describe, test, responses } from './helper.js'

describe('Visit the changelog', () => {
  let app

  beforeEach(async () => {
    app = await mountApp({
      fetch: responses([''])
    })

    await app.click('[aria-label="Visit Changelog"]')
  })

  test('shows the remote title', () => {
    expect(app.find('[aria-label="Page title"]').text()).toEqual('Changelog')
  })

  test('seeds the most recent post')
  test('fetches the feed')
})
