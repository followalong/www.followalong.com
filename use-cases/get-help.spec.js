import { mountApp, describe, test, story } from './helper.js'
import localForage from 'localforage'

describe('Get help', () => {
  let app
  let identity

  beforeEach(async () => {
    app = await mountApp()
    identity = app.vm.identity

    await app.click('[aria-label="Help"]')
  })

  story('shows a way to connect via email', () => {
    expect(app.text()).toContain('followalong@protonmail.com')
  })
})
