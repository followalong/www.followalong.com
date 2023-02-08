import { mountApp, describe, story, event, responses } from './helper.js'

describe('Set up an RSS proxy', () => {
  const proxyUrl = 'https://foo.bar/'

  let app
  let fetch

  beforeEach(async () => {
    fetch = responses([''])
    app = await mountApp({
      fetch,
      state: {
        abc123: {
          config: {},
          data: `
            0/identities/abc123/create/v2.1
            1/feeds/543/create/v2.1 {"url":"https://foo.bar/rss.xml","data":{"title":"Feed title"}}
          `
        }
      }
    })

    await app.click('[aria-label="Add-ons"]')
    await app.click('[aria-label="Go to marketplace"]')
    await app.click('[aria-label="Configure CORSAnywhere"]')
    await app.find('[aria-label="Configure CORSAnywhere url"]').setValue(proxyUrl)
    await app.submit('[aria-label="Save CORSAnywhere"]')
  })

  story('uses the proxy', async () => {
    console.log(app.vm.state.addons)
    await app.vm.commands.fetchFeed(app.vm.identity, app.vm.state.feeds[0])

    expect(fetch).toHaveBeenCalledWith('https://foo.bar/https://foo.bar/rss.xml')
  })

  event('addons.configure', {
    data: {
      type: 'CORSAnywhere',
      data: {
        url: proxyUrl
      }
    }
  }, () => { return { app } })
})
