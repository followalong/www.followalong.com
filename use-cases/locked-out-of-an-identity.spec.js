import { mountApp, describe, story, vi } from './helper.js'
import MultiEventStore from '../src/state/multi-event-store.js'
import runners from '../src/state/runners.js'
import { encrypt, decrypt } from '../src/queries/crypt.js'

const DATA = `0/identities/abc123/create/v2.1 {"name":"My Account"}
1/feeds/543/create/v2.1 {"url":"https://foo.bar/rss.xml","data":{"title":"Feed title"}}`

describe('A wrong password locks out rather than looking empty', () => {
  let app
  let store

  beforeEach(async () => {
    store = new MultiEventStore(`locked-${Math.random()}`, 'v2.1', runners)

    await store.clear()

    store.createDB('abc123', {})
    store.importRaw('abc123', DATA)

    // Seal everything already on disk under a password this session will not
    // be given.
    store.setCipher('abc123', { encrypt: encrypt('right-one'), decrypt: decrypt('right-one') })

    await store.rewriteAll('abc123')

    store._dbs.abc123._events.splice(0)
    store._dbs.abc123._resetCollections()

    app = await mountApp({ store, prompt: vi.fn().mockReturnValue('wrong-one') })
  })

  story('reads none of the events', () => {
    expect(app.vm.queries.allIdentities()).toHaveLength(0)
    expect(store.undecryptableFor('abc123')).toBeGreaterThan(0)
  })

  story('does not invent a replacement identity', () => {
    expect(app.vm.queries.allIdentities()).toHaveLength(0)
  })

  story('says the data is still there', () => {
    expect(app.find('[aria-label="Locked identity"]').exists()).toEqual(true)
    expect(app.text()).toContain('still here')
    expect(app.text()).toContain('Nothing has been deleted')
  })

  story('offers a way to try again', () => {
    expect(app.find('[aria-label="Try the password again"]').exists()).toEqual(true)
  })
})
