import { mountApp, describe, story, vi } from './helper.js'
import Commands from '../src/commands/index.js'

const POLL_INTERVAL = 5 * 60 * 1000

const seed = `
  0/identities/abc123/create/v2.1 {"name":"My Account"}
  1/signals/134/create/v2.1 {"data":{"title":"Home","permalink":"home","order":"0"}}
  2/feeds/543/create/v2.1 {"url":"https://foo.bar/rss.xml","data":{"title":"Feed title"}}
`

// The sweep's timeout is module state, so it outlives any one shell, and the
// listeners that record a run ending are attached from a promise that can
// settle after the shell has gone.
describe('Stop working when the app goes', () => {
  let app
  let fetch

  beforeEach(async () => {
    fetch = vi.fn().mockResolvedValue({ status: 304, body: '' })

    app = await mountApp({
      fetch,
      automaticFetch: true,
      state: { abc123: { config: {}, data: seed } }
    })

    app.unmount()
    fetch.mockClear()
  })

  story('stops sweeping for feeds', async () => {
    vi.advanceTimersByTime(POLL_INTERVAL * 2)
    await app.wait()

    expect(fetch).not.toHaveBeenCalled()
  })

  story('stops writing down that the run ended', async () => {
    const noteRunEnded = vi.spyOn(Commands.prototype, 'noteRunEnded')

    window.dispatchEvent(new Event('pagehide'))
    document.dispatchEvent(new Event('visibilitychange'))
    await app.wait()

    expect(noteRunEnded).not.toHaveBeenCalled()

    noteRunEnded.mockRestore()
  })
})
