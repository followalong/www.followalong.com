import { mountApp, describe, story, test } from './helper.js'

describe('See a feed with no title', () => {
  let app

  beforeEach(async () => {
    app = await mountApp({
      path: '/following',
      state: {
        abc123: {
          config: {},
          data: `
            0/identities/abc123/create/v2.1
            1/signals/134/create/v2.1 {"data":{"title":"Home","permalink":"home","order":"0"}}
            2/feeds/titled/create/v2.1 {"url":"https://has-title.example/rss","data":{"title":"Has a title"}}
            3/feeds/untitled/create/v2.1 {"url":"https://no-title.example/rss","data":{}}
            4/feeds/nothing/create/v2.1 {"data":{}}
          `
        }
      }
    })
  })

  story('falls back to the url so the row is not blank', () => {
    expect(app.text()).toContain('https://no-title.example/rss')
  })

  test('still lets me click into it', () => {
    const link = app.findAll('[aria-label^="Visit "]')
      .find((el) => el.attributes('aria-label').indexOf('no-title.example') !== -1)

    expect(link).toBeTruthy()
    expect(link.attributes('href')).toContain('no-title.example/rss')
  })

  test('names a feed that has neither, rather than showing nothing', () => {
    const labels = app.findAll('[aria-label^="Visit "]').map((el) => el.attributes('aria-label'))

    expect(labels.filter((l) => l.trim() === 'Visit  feed').length).toEqual(0)
    expect(app.text()).toContain('Untitled feed')
  })
})
