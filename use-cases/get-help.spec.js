import { mountApp, describe, story } from './helper.js'

describe('Get help', () => {
  let app

  beforeEach(async () => {
    app = await mountApp()

    await app.click('[aria-label="You"]')
    await app.click('[aria-label="Help"]')
  })

  story('shows a way to connect via email', () => {
    expect(app.text()).toContain('followalong@protonmail.com')
  })
})
