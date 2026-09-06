// A record of the app's own runs, so that it restarting on its own is
// something the reader can see rather than something they have to describe.
//
// The whole trick is that a run cannot report its own death. So each run is
// written down when it starts and marked closed when the app is put away, and
// anything still open when the next run starts was killed. Absence is the
// signal.
//
// Ten runs. A restart worth chasing happens once or twice a day, so ten covers
// the best part of a week, and the list is read and rewritten whole on every
// boot — it has to stay one small object rather than something that grows.
const KEPT = 10

const sessionsIn = (config) => {
  const list = config && config.sessions

  return Array.isArray(list) ? list : []
}

const patchLast = (list, patch) => {
  if (!list.length) return list

  return list.slice(0, -1).concat([Object.assign({}, list[list.length - 1], patch)])
}

// Opening a run is also the only chance to notice that the last one never
// closed. `wasSyncing` is read off the config the dead run left behind: a
// backup writes the whole log, and knowing whether one was in flight is what
// separates a memory spike we caused from one we did not.
const started = (list, { at, route, wasSyncing }) => {
  return list
    .map((run) => {
      if (run.closedAt || run.diedAt) return run

      return Object.assign({}, run, { diedAt: at, wasSyncing: !!wasSyncing })
    })
    .concat([{ at, route: route || '', closedAt: 0, diedAt: 0, playing: null }])
    .slice(-KEPT)
}

const closed = (list, at) => patchLast(list, { closedAt: at })

// Being hidden is not being dead. Without this, a death any time after the
// first trip to the home screen would read as a clean exit.
const resumed = (list) => patchLast(list, { closedAt: 0 })

const nowPlaying = (list, what) => patchLast(list, { playing: what || null })

const deaths = (list) => {
  return list
    .filter((run) => run.diedAt)
    .map((run) => ({
      at: run.diedAt,
      lasted: run.diedAt - run.at,
      route: run.route,
      wasSyncing: !!run.wasSyncing,
      playing: run.playing || null,
      playedFor: run.playing ? run.diedAt - run.playing.at : 0
    }))
    .reverse()
}

export { KEPT, sessionsIn, started, closed, resumed, nowPlaying, deaths }
