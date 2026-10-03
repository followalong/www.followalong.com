import { mountApp, describe, story, test, hostedService } from './helper.js'
import links, { follow } from '../src/queries/links.js'

const EMAIL = 'reader@example.com'

const SEED = `
  0/identities/abc123/create/v2.1 {"name":"My Account"}
  1/signals/134/create/v2.1 {"data":{"title":"Home","permalink":"home","order":"0"}}
  2/feeds/543/create/v2.1 {"url":"https://foo.bar/rss.xml","data":{"title":"Feed title"}}
`

// The email the service sends carries a link as well as the code. Opened on
// the device that asked, it signs the device in; the shell hands the same
// link over from a Universal Link or the custom scheme.
describe('Sign in from a link', () => {
  let service
  let app

  const settle = async () => {
    for (let i = 0; i < 8; i++) await app.wait()
  }

  const link = (code) => `https://www.followalong.com/settings#signin=${code}&email=${encodeURIComponent(EMAIL)}`

  beforeEach(async () => {
    service = hostedService()
    links.signin = null
    app = await mountApp({ hostedFetch: service.fetch, state: { abc123: { config: {}, data: SEED } } })
  })

  afterEach(() => app.unmount())

  story('signs the device in and syncs', async () => {
    follow(link(service.code), app.vm.$router)
    await settle()

    expect(app.text()).toContain(`Signed in as ${EMAIL}.`)
    expect(service.body()).toContain('https://foo.bar/rss.xml')
    expect(links.signin).toEqual(null)
  })

  story('is taken by the You page already open', async () => {
    await app.click('[aria-label="You"]')

    follow(link(service.code), app.vm.$router)
    await settle()

    expect(app.text()).toContain(`Signed in as ${EMAIL}.`)
  })

  test('shows the form, filled in, when the code is not right', async () => {
    follow(link('000000'), app.vm.$router)
    await settle()

    expect(app.text()).toContain('That code is not right. Ask for a new one and try again.')
    expect(app.find('[aria-label="Code"]').exists()).toEqual(true)
    expect(app.text()).toContain(`We sent a six digit code to ${EMAIL}.`)
  })

  test('is not taken by a device that is signed in already', async () => {
    await app.vm.commands.signInToAccount(app.vm.identity, { email: 'other@example.com', code: service.code })

    follow(link(service.code), app.vm.$router)
    await settle()

    expect(app.text()).toContain('Signed in as other@example.com.')
    expect(links.signin).toEqual(null)
  })
})
