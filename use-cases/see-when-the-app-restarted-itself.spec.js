import { mountApp, reloadApp, describe, story } from './helper.js'

const seed = `
  0/identities/abc123/create/v2.1 {"name":"My Account"}
  1/signals/134/create/v2.1 {"data":{"title":"Home","permalink":"home","order":"0"}}
  2/feeds/543/create/v2.1 {"url":"https://foo.bar/rss.xml","data":{"title":"Feed title"}}
  3/entries/tube/create/v2.1 {"feedId":"543","data":{"guid":"tube","id":"yt:video:abc123xyz","title":"A youtube video"}}
`

const hide = () => {
  Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
}

const show = () => {
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('See when the app restarted itself', () => {
  const boot = async (state) => {
    const app = await mountApp({
      fetch: () => Promise.resolve({ status: 304, body: '' }),
      state
    })
    await app.wait()
    return app
  }

  let app

  beforeEach(async () => {
    app = await boot({ abc123: { config: {}, data: seed } })
  })

  story('has nothing to report on a first run', () => {
    expect(app.vm.queries.restartsForIdentity(app.vm.identity)).toEqual([])
  })

  story('writes the diagnostics on the device, not into the log', () => {
    expect(app.vm.state.getNote(app.vm.identity.id, 'runs')).toHaveLength(1)
    expect(app.vm.queries.eventsToFile(app.vm.identity)).not.toContain('closedAt')
  })

  // The browser gives `pagehide` and then takes the page; a write still in
  // flight never lands. Nine reloads once read as nine restarts.
  story('a reload is not a restart', async () => {
    const again = await reloadApp(app, { fetch: () => Promise.resolve({ status: 304, body: '' }) })
    await again.wait()

    expect(again.vm.queries.restartsForIdentity(again.vm.identity)).toEqual([])
    expect(again.vm.state.getNote(again.vm.identity.id, 'runs')).toHaveLength(2)
  })

  describe('when the app is put away properly', () => {
    story('nothing is reported', async () => {
      hide()
      await app.wait()

      const store = app.vm.state
      const again = await mountApp({ fetch: () => Promise.resolve({ status: 304, body: '' }), store })
      await again.wait()

      expect(again.vm.queries.restartsForIdentity(again.vm.identity)).toEqual([])
      show()
    })

    story('coming back reopens the run, so a death after it still counts', async () => {
      hide()
      await app.wait()
      show()
      await app.wait()

      const store = app.vm.state
      const again = await mountApp({ fetch: () => Promise.resolve({ status: 304, body: '' }), store })
      await again.wait()

      expect(again.vm.queries.restartsForIdentity(again.vm.identity)).toHaveLength(1)
    })
  })

  // The app cannot report its own death, so the next run reports it instead.
  describe('when the app is killed while playing a YouTube video', () => {
    let next

    beforeEach(async () => {
      const entry = app.vm.queries.entriesForIdentity(app.vm.identity)
        .find((e) => app.vm.queries.titleForEntry(e) === 'A youtube video')

      app.vm.play(entry)
      await app.wait()

      // No hide, no pagehide: the process simply went away.
      next = await mountApp({ fetch: () => Promise.resolve({ status: 304, body: '' }), store: app.vm.state })
      await next.wait()
    })

    story('the next run reports it', () => {
      expect(next.vm.queries.restartsForIdentity(next.vm.identity)).toHaveLength(1)
    })

    story('and says what was playing', () => {
      const [restart] = next.vm.queries.restartsForIdentity(next.vm.identity)

      expect(restart.playing).toMatchObject({ kind: 'youtube', title: 'A youtube video' })
      expect(restart.playedFor).toBeGreaterThanOrEqual(0)
      expect(restart.lasted).toBeGreaterThanOrEqual(0)
    })

    story('shows it on the You page', async () => {
      next.vm.$router.push('/settings')
      await next.wait()

      expect(next.text()).toContain('Restarted on its own')
      expect(next.text()).toContain('YouTube video')
    })

    story('and can be cleared from there', async () => {
      next.vm.$router.push('/settings')
      await next.wait()
      await next.click('[aria-label="Forget restarts"]')

      expect(next.vm.queries.restartsForIdentity(next.vm.identity)).toEqual([])
      expect(next.text()).not.toContain('Restarted on its own')
    })
  })

  // One row per death is a wall on a phone that dies often. The count and the
  // latest are the sentence; the list waits behind a tap.
  describe('when it has happened more than once', () => {
    let third

    beforeEach(async () => {
      const second = await mountApp({ fetch: () => Promise.resolve({ status: 304, body: '' }), store: app.vm.state })
      await second.wait()
      third = await mountApp({ fetch: () => Promise.resolve({ status: 304, body: '' }), store: second.vm.state })
      await third.wait()
      third.vm.$router.push('/settings')
      await third.wait()
    })

    story('folds the restarts into one line with the count and the latest', () => {
      expect(third.vm.queries.restartsForIdentity(third.vm.identity)).toHaveLength(2)
      expect(third.findAll('[data-restart]')).toHaveLength(0)
      expect(third.find('[aria-label="Show restarts"]').text()).toContain('Restarted on its own 2 times')
      expect(third.find('[aria-label="Show restarts"]').text()).toContain('last Today at')
    })

    story('keeps the list behind a tap', async () => {
      await third.click('[aria-label="Show restarts"]')

      expect(third.findAll('[data-restart]')).toHaveLength(2)
    })

    story('still offers to forget them', async () => {
      await third.click('[aria-label="Forget restarts"]')

      expect(third.find('[aria-label="Show restarts"]').exists()).toEqual(false)
    })
  })

  story('one restart stays a row of its own', async () => {
    const next = await mountApp({ fetch: () => Promise.resolve({ status: 304, body: '' }), store: app.vm.state })
    await next.wait()
    next.vm.$router.push('/settings')
    await next.wait()

    expect(next.findAll('[data-restart]')).toHaveLength(1)
    expect(next.find('[aria-label="Show restarts"]').exists()).toEqual(false)
  })

  story('stopping playback stops it being blamed', async () => {
    const entry = app.vm.queries.entriesForIdentity(app.vm.identity)
      .find((e) => app.vm.queries.titleForEntry(e) === 'A youtube video')

    app.vm.play(entry)
    await app.wait()
    await app.click('[data-pip-close]')

    const next = await mountApp({ fetch: () => Promise.resolve({ status: 304, body: '' }), store: app.vm.state })
    await next.wait()

    expect(next.vm.queries.restartsForIdentity(next.vm.identity)[0].playing).toEqual(null)
  })

  story('says so plainly on the You page when there is nothing to report', async () => {
    app.vm.$router.push('/settings')
    await app.wait()

    expect(app.text()).toContain('has not restarted on its own')
  })

  story('survives a store that cannot be written to', async () => {
    app.vm.state.setNote = () => { throw new Error('no room') }

    expect(() => app.vm.commands.noteRunEnded(app.vm.identity)).not.toThrow()
    expect(app.vm.queries.restartsForIdentity(app.vm.identity)).toEqual([])
  })
})
