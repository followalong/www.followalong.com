import { mountApp, describe, story, test } from './helper.js'

// Rolling up is retired, but logs written while it existed are still out
// there, and every object inside one exists only in that event. This is what
// one of those logs looks like arriving on a device that can no longer make
// another.
const ROLLED_UP = (time) => `${time}/identities/rolled/rollup/v2.3 ${JSON.stringify({
  identity: { id: 'rolled', name: 'Rolled up', createdAt: 1000, hints: [] },
  feeds: [
    { id: 'f1', url: 'https://a.example/feed', createdAt: 1100, updatedAt: 1200, data: { title: 'A feed' } },
    { id: 'f2', url: 'https://b.example/feed', createdAt: 1101, updatedAt: 1201, data: { title: 'Another feed' } }
  ],
  entries: [
    { id: 'e1', feedId: 'f1', createdAt: 1300, savedAt: 1400, data: { guid: 'g1', title: 'A saved entry' } },
    { id: 'e2', feedId: 'f1', createdAt: 1301, readAt: 1401, data: { guid: 'g2', title: 'An ordinary entry' } }
  ],
  signals: [{ id: 's1', createdAt: 1000, order: 0, data: { title: 'Home', permalink: 'home' } }],
  addons: [{ id: 'FollowAlongFree', type: 'FollowAlongFree', updatedAt: 1000, data: {} }]
})}`

describe('Open a log that was rolled up', () => {
  let app

  beforeEach(async () => {
    app = await mountApp({ state: { rolled: { config: {}, data: ROLLED_UP(2000) } } })
  })

  const identity = () => app.vm.queries.allIdentities().find((one) => one.id === 'rolled')

  story('is still the identity it was', () => {
    expect(app.vm.queries.nameForIdentity(identity())).toEqual('Rolled up')
  })

  story('still has everything that was folded into it', () => {
    expect(app.vm.queries.feedsForIdentity(identity()).map((f) => f.data.title).sort()).toEqual(['A feed', 'Another feed'])
    expect(app.vm.queries.entriesForIdentity(identity())).toHaveLength(2)
  })

  test('remembers what was read and what was saved', () => {
    const saved = app.vm.queries.savedEntriesForIdentity(identity())

    expect(saved.map((e) => app.vm.queries.titleForEntry(e))).toEqual(['A saved entry'])
  })

  // The one filter that cannot work an entry at a time, because inside a
  // rollup they are not separate events.
  test('copies only the entries that were saved', () => {
    const copied = app.vm.commands.portableIdentity(identity())

    expect(copied).toContain('A saved entry')
    expect(copied).not.toContain('An ordinary entry')
  })

  test('can still be pasted somewhere else, having no create event to find', async () => {
    const elsewhere = await mountApp({})

    await elsewhere.vm.commands.importIdentity(app.vm.commands.portableIdentity(identity()))

    const arrived = elsewhere.vm.queries.allIdentities().find((one) => one.id === 'rolled')

    expect(arrived).toBeTruthy()
    expect(elsewhere.vm.queries.feedsForIdentity(arrived)).toHaveLength(2)
  })

  // Nothing supersedes a rollup, so a second one folds alongside the first.
  test('folds a second rollup without losing the first', async () => {
    await app.vm.state.importRaw('rolled', ROLLED_UP(3000).replace('"A feed"', '"A renamed feed"'))

    expect(app.vm.queries.feedsForIdentity(identity()).map((f) => f.data.title)).toContain('A renamed feed')
  })
})
