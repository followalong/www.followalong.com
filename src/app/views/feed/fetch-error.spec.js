import { mount } from '@vue/test-utils'
import { describe, test, expect, beforeEach } from 'vitest'
import MultiEventStore from '../../../state/multi-event-store.js'
import runners from '../../../state/runners.js'
import Queries from '../../../queries/index.js'
import Commands from '../../../commands/index.js'
import FetchError from '../../../adapters/fetch-error.js'
import Feed from './component.vue'

const URL = 'https://world.hey.com/dhh/feed.atom'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('the feed view when a feed refuses', () => {
  let state, queries, commands, identity, app

  beforeEach(async () => {
    const fetch = () => Promise.reject(new FetchError(403, URL))

    state = new MultiEventStore(`view-${Math.random()}`, 'v2.3', runners)
    await state.clear()
    identity = { id: state.createDB(null, {}) }
    queries = new Queries({ state, fetch })
    commands = new Commands({ state, queries, fetch, scrollTo: () => {} })

    state.track(identity.id, 'feeds', 'f1', 'create', { url: URL, data: { title: 'DHH' } })

    app = { queries, commands }
  })

  const render = (feedUrl = URL) => mount(Feed, {
    props: { app, identity },
    global: {
      stubs: { NewBar: true, SearchBox: true, FeedEntry: true, RouterLink: true },
      mocks: {
        $route: { params: { feedUrl }, fullPath: `/${feedUrl}` }
      }
    }
  })

  test('says why the feed is empty instead of loading forever', async () => {
    const wrapper = render()

    await flush()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('403')
    expect(wrapper.text()).toContain('world.hey.com')
    expect(wrapper.text()).not.toContain('Loading...')
  })

  test('says so on a feed nobody follows, which is what a shared link opens', async () => {
    const stranger = 'https://example.com/nothing-here.xml'
    const wrapper = render(stranger)

    await flush()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('403')
    expect(wrapper.text()).toContain(stranger)
  })

  test('still says so after a reload, from the recorded failure', async () => {
    await commands.fetchFeed(identity, queries.feedForIdentity(identity, 'f1')).catch(() => {})

    expect(queries.fetchErrorForFeed(queries.feedForIdentity(identity, 'f1'))).toContain('403')
  })
})
