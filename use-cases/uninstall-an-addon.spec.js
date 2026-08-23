import { mountApp, describe, story, event } from './helper.js'

describe('Uninstall an add-on', () => {
  let app

  beforeEach(async () => {
    app = await mountApp({
      state: {
        abc123: {
          config: {},
          data: `
            0/identities/abc123/create/v2.1
            1/addons/777/configure/v2.1 {"type":"CORSAnywhere","data":{"url":"https://foo.bar/"}}
          `
        }
      }
    })

    await app.click('[aria-label="You"]')
    await app.click('[aria-label="Add-ons"]')
  })

  story('lists the installed add-on', () => {
    expect(app.text()).toContain('CORSAnywhere Proxy')
  })

  describe('Removing it', () => {
    beforeEach(async () => {
      await app.click('[aria-label="Configure CORSAnywhere"]')
      await app.click('[aria-label="Uninstall CORSAnywhere"]')
    })

    story('drops it from the list', () => {
      expect(app.vm.queries.addonAdaptersForIdentity(app.vm.identity)).toHaveLength(0)
    })

    event('addons.delete', {
      objectId: '777'
    }, () => { return { app } })
  })
})
