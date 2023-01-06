import { mountApp, describe, test, responses, story } from './helper.js'

describe('Visit the changelog', () => {
  const remoteEntryName = 'Remote title'

  let app

  beforeEach(async () => {
    app = await mountApp({
      fetch: responses([`<feed><entry><id>123</id><title>${remoteEntryName}</title></entry></feed>`])
    })

    await app.click('[aria-label="Visit Changelog"]')
  })

  story('shows the remote title', () => {
    expect(app.find('[aria-label="Page title"]').text()).toEqual('Changelog')
  })

  test('seeds the most recent entry', () => {
    expect(app.findAll('[aria-label="Entry title"]')[0].text()).toEqual('Twitter is done. Long live RSS.')
  })

  test('fetches the remote entries', () => {
    expect(app.findAll('[aria-label="Entry title"]')[1].text()).toEqual(remoteEntryName)
  })
})
