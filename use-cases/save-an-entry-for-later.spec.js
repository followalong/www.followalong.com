import { mountApp, describe, story, test, event } from './helper.js'

describe('Save an entry for later', () => {
  const entryId = '6363'

  let app

  beforeEach(async () => {
    app = await mountApp({
      state: {
        abc123: {
          config: {},
          data: `
            0/identities/abc123/create/v2.1
            1/signals/134/create/v2.1 {"data":{"title":"Home","permalink":"home","order":"0"}}
            2/signals/135/create/v2.3 {"data":{"title":"Saved","permalink":"saved","order":"5","filter":"(queries) => { return (entry) => queries.isEntrySaved(entry) }"}}
            3/feeds/543/create/v2.1 {"url":"https://foo.bar/rss.xml","data":{"title":"Feed title"}}
            4/entries/${entryId}/create/v2.1 {"feedId":"543","data":{"guid":"987","title":"Entry title"}}
            5/entries/6364/create/v2.1 {"feedId":"543","data":{"guid":"988","title":"Not saved"}}
          `
        }
      }
    })

    await app.click(`[aria-label="Save ${entryId}"]`)
  })

  story('toggles the marker', () => {
    expect(app.findAll(`[aria-label="Unsave ${entryId}"]`).length).toEqual(1)
  })

  test('collects it under the Saved signal', async () => {
    await app.vm.$router.push('/signals/saved')
    await app.wait()

    const titles = app.findAll('[aria-label="Entry title"]').map((el) => el.text())

    expect(titles).toEqual(['Entry title'])
  })

  test('lets me take it back out again', async () => {
    await app.click(`[aria-label="Unsave ${entryId}"]`)

    expect(app.findAll(`[aria-label="Save ${entryId}"]`).length).toEqual(1)

    await app.vm.$router.push('/signals/saved')
    await app.wait()

    expect(app.findAll('[aria-label="Entry title"]').length).toEqual(0)
  })

  event('entries.save', {
    objectId: entryId
  }, () => { return { app } })
})
