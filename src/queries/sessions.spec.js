import { describe, test, expect } from 'vitest'
import { KEPT, sessionsIn, started, closed, resumed, nowPlaying, deaths } from './sessions.js'

describe('sessions', () => {
  test('reads nothing out of a config that has never held one', () => {
    expect(sessionsIn({})).toEqual([])
    expect(sessionsIn(undefined)).toEqual([])
    expect(sessionsIn({ sessions: 'rubbish' })).toEqual([])
  })

  test('opens a run', () => {
    const list = started([], { at: 100, route: '/following' })

    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ at: 100, route: '/following', closedAt: 0, diedAt: 0 })
  })

  // The whole mechanism: a run that never got to say goodbye was killed, and
  // the only moment anyone can notice is the next time the app starts.
  test('marks a run that never closed as having died, when the next one opens', () => {
    const before = started([], { at: 100, route: '/' })
    const after = started(before, { at: 160, route: '/', wasSyncing: true })

    expect(after[0]).toMatchObject({ at: 100, diedAt: 160, wasSyncing: true })
    expect(after[1]).toMatchObject({ at: 160, diedAt: 0 })
  })

  test('leaves a run that closed properly alone', () => {
    const before = closed(started([], { at: 100, route: '/' }), 150)
    const after = started(before, { at: 160, route: '/' })

    expect(after[0]).toMatchObject({ closedAt: 150, diedAt: 0 })
  })

  test('does not re-stamp a death it already recorded', () => {
    const first = started([], { at: 100, route: '/' })
    const second = started(first, { at: 160, route: '/' })
    const third = started(second, { at: 900, route: '/' })

    expect(third[0].diedAt).toEqual(160)
  })

  // Hiding the app is not dying. Coming back has to reopen the run, or a
  // death after the first trip to the home screen would read as a clean exit.
  test('reopens a run that was only hidden', () => {
    const list = resumed(closed(started([], { at: 100, route: '/' }), 150))

    expect(list[0].closedAt).toEqual(0)
  })

  test('remembers what was playing, and forgets it when it stops', () => {
    const playing = nowPlaying(started([], { at: 100, route: '/' }), { kind: 'youtube', title: 'A clip', at: 120 })
    expect(playing[0].playing).toMatchObject({ kind: 'youtube', title: 'A clip', at: 120 })

    expect(nowPlaying(playing, null)[0].playing).toEqual(null)
  })

  test('keeps only the last few', () => {
    let list = []
    for (let i = 0; i < KEPT + 6; i++) list = started(list, { at: i * 10, route: '/' })

    expect(list).toHaveLength(KEPT)
    expect(list[0].at).toEqual(60)
  })

  test('patches nothing when there is no run to patch', () => {
    expect(closed([], 10)).toEqual([])
    expect(nowPlaying([], { kind: 'audio' })).toEqual([])
  })

  describe('what the reader is shown', () => {
    test('is only the runs that died, newest first', () => {
      let list = started([], { at: 100, route: '/following' })
      list = nowPlaying(list, { kind: 'youtube', title: 'A clip', at: 130 })
      list = started(list, { at: 190, wasSyncing: true, route: '/' })
      list = closed(list, 300)
      list = started(list, { at: 400, route: '/' })

      const seen = deaths(list)

      expect(seen).toHaveLength(1)
      expect(seen[0]).toMatchObject({
        at: 190,
        lasted: 90,
        route: '/following',
        wasSyncing: true,
        playedFor: 60,
        playing: { kind: 'youtube', title: 'A clip' }
      })
    })

    test('says nothing about playback for a run that was not playing', () => {
      const list = started(started([], { at: 100, route: '/' }), { at: 160, route: '/' })

      expect(deaths(list)[0]).toMatchObject({ playing: null, playedFor: 0 })
    })

    test('is empty when nothing has ever died', () => {
      expect(deaths(closed(started([], { at: 1, route: '/' }), 2))).toEqual([])
    })
  })
})
