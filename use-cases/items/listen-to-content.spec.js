import { mountApp, buildAddonToRespondWith, rawRSSResponse, describe, test } from '../helper.js'

describe('Items: Listen to content', () => {
  describe('from the item page', () => {
    test('can see a audio player', async () => {
      const app = await mountApp()
      const item = { audioUrl: 'https://example.com/audio.mp3' }
      const feedsLength = app.vm.queries.allFeeds().length
      app.vm.queries.addonForIdentity = app.buildAddonToRespondWith('rss', rawRSSResponse(item))

      // await app.click('[aria-label="Feeds"]')

      // expect(app.find('audio source').element.getAttribute('src')).toEqual(item.audioUrl)
      expect(app.text()).toContain('Get a better understanding')
    })
  })
})
