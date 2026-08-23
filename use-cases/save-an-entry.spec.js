import { mountApp, describe, story, event } from './helper.js'

describe('Save an entry', () => {
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
            2/feeds/543/create/v2.1 {"url":"https://foo.bar/rss.xml","data":{"title":"Feed title"}}
            3/entries/${entryId}/create/v2.1 {"feedId":"543","data":{"guid":"987","title":"Entry title"}}
          `
        }
      }
    })

    await app.click(`[aria-label="Save ${entryId}"]`)
  })

  story('toggles the marker', () => {
    expect(app.findAll(`[aria-label="Unsave ${entryId}"]`).length).toEqual(1)
  })

  story('adds a Saved signal to look at them in', () => {
    const saved = app.vm.queries.signalForIdentity(app.vm.identity, 'saved')

    expect(saved).toBeTruthy()
  })

  story('collects the entry under that signal', () => {
    const saved = app.vm.queries.signalForIdentity(app.vm.identity, 'saved')

    expect(app.vm.queries.entriesForSignal(app.vm.identity, saved)).toHaveLength(1)
  })

  event('entries.save', {
    objectId: entryId
  }, () => { return { app } })

  describe('Unsaving it', () => {
    beforeEach(async () => {
      await app.click(`[aria-label="Unsave ${entryId}"]`)
    })

    story('drops it from the signal', () => {
      const saved = app.vm.queries.signalForIdentity(app.vm.identity, 'saved')

      expect(app.vm.queries.entriesForSignal(app.vm.identity, saved)).toHaveLength(0)
    })

    event('entries.unsave', {
      objectId: entryId
    }, () => { return { app } })
  })
})
