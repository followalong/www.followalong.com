import { mountApp, describe, story } from './helper.js'

const seed = `
  0/identities/abc123/create/v2.1 {"name":"My Account"}
  1/signals/134/create/v2.1 {"data":{"title":"Home","permalink":"home","order":"0"}}
  2/feeds/543/create/v2.1 {"url":"https://foo.bar/rss.xml","data":{"title":"Feed title"}}
  3/entries/kept/create/v2.1 {"feedId":"543","data":{"guid":"1","title":"Kept entry"}}
  4/entries/other/create/v2.1 {"feedId":"543","data":{"guid":"2","title":"Ordinary entry"}}
`

describe('Find my saved entries', () => {
  let app

  const save = async () => {
    await app.click('[aria-label="Save kept"]')
  }

  beforeEach(async () => {
    app = await mountApp({ state: { abc123: { config: {}, data: seed } } })
  })

  story('offers a way in from You once something is saved', async () => {
    await save()
    await app.click('[aria-label="You"]')

    expect(app.find('[aria-label="Saved entries"]').exists()).toEqual(true)
    expect(app.find('[aria-label="Saved entries"]').text()).toContain('1')
  })

  story('shows what was saved and nothing else', async () => {
    await save()
    await app.click('[aria-label="You"]')
    await app.click('[aria-label="Saved entries"]')

    const titles = app.findAll('[aria-label="Entry title"]').map((el) => el.text())

    expect(titles).toEqual(['Kept entry'])
  })

  story('says so when nothing is saved rather than showing everything', async () => {
    await app.vm.$router.push('/signals/saved')
    await app.wait()

    expect(app.findAll('[aria-label="Entry title"]')).toHaveLength(0)
    expect(app.text()).toContain('Nothing saved')
  })
})
