import { mountApp, describe, story, event, responses } from './helper.js'

describe('Set up an RSS proxy', () => {
  const proxyUrl = 'https://foo.bar/'

  let app
  let fetch

  beforeEach(async () => {
    fetch = responses([''])
    app = await mountApp({
      fetch
    })

    await app.click('[aria-label="Add-ons"]')
    await app.click('[aria-label="Configure rss"]')
    await app.find('[aria-label="Configure rss adapter"]').setValue('CORSAnywhere')
    await app.find('[aria-label="Configure rss url"]').setValue(proxyUrl)
    await app.submit('[aria-label="Save rss"]')
  })

  story('saves the proxy', async () => {
    await app.vm.commands.fetchFeed(app.vm.identity, app.vm.state.feeds[0])

    expect(fetch).toHaveBeenCalledWith('https://foo.bar/https://changelog.followalong.com/feed.xml')
  })

  event('identities.setProxy', {
    data: {
      addonType: 'rss',
      data: {
        data: {
          url: proxyUrl
        }
      }
    }
  }, () => { return { app } })
})
