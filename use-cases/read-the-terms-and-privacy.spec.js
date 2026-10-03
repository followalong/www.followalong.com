import { mountApp, describe, story } from './helper.js'

// Two pages a subscription cannot be sold without. Reachable by route, because
// the buy buttons link straight to them, and from Help and About, because that
// is where a reader goes looking.
describe('Read the terms and privacy', () => {
  let app

  const title = () => app.find('[aria-label="Page title"]').text()

  describe('from Help', () => {
    beforeEach(async () => {
      app = await mountApp({ path: '/help' })
    })

    story('says where a feed link is usually found', () => {
      expect(app.text()).toContain('/feed')
      expect(app.text()).toContain('YouTube')
    })

    story('opens the terms', async () => {
      await app.click('[aria-label="Terms"]')

      expect(title()).toEqual('Terms')
      expect(app.text()).toContain('renews')
      expect(app.text()).toContain('followalong@protonmail.com')
    })

    story('opens the privacy page', async () => {
      await app.click('[aria-label="Privacy"]')

      expect(title()).toEqual('Privacy')
      expect(app.text()).toContain('No tracking')
    })
  })

  describe('from About', () => {
    beforeEach(async () => {
      app = await mountApp({ path: '/about' })
    })

    story('links to both', async () => {
      expect(app.find('[aria-label="Terms"]').exists()).toEqual(true)
      expect(app.find('[aria-label="Privacy"]').exists()).toEqual(true)
    })
  })

  describe('by route', () => {
    story('/terms is the terms', async () => {
      app = await mountApp({ path: '/terms' })

      expect(title()).toEqual('Terms')
      expect(app.find('[aria-label="Back"]').exists()).toEqual(true)
    })

    story('/privacy is the privacy page', async () => {
      app = await mountApp({ path: '/privacy' })

      expect(title()).toEqual('Privacy')
      expect(app.text()).toContain('readable by the service')
    })
  })
})
