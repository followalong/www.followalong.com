import { mount } from '@vue/test-utils'
import { describe, test, expect } from 'vitest'
import SearchPanel from './component.vue'

const FEED = { id: 'f1', url: 'https://changelog.example/feed.xml' }
const ENTRY = { id: 'e1', feedId: 'f1' }

const app = {
  queries: {
    feedsForIdentity: () => [FEED],
    entriesForIdentity: () => [ENTRY],
    entriesForFeed: () => [ENTRY],
    feedForIdentity: () => FEED,
    titleForFeed: () => 'Changelog',
    titleForEntry: () => 'Twitter is done. Long live RSS.',
    niceDateForEntry: () => '08:27 AM',
    urlForFeed: (feed) => feed.url
  }
}

const stubs = { RouterLink: { template: '<a><slot /></a>', props: ['to'] } }

const panel = (props = {}) => {
  return mount(SearchPanel, {
    props: { app, identity: { id: 'i1' }, ...props },
    global: { stubs }
  })
}

const searchFor = async (q, props) => {
  const wrapper = panel(props)

  await wrapper.get('input').setValue(q)

  return wrapper
}

describe('SearchPanel', () => {
  test('takes the screen over with the chrome bar', () => {
    expect(panel().get('[data-search-panel]').classes()).toContain('bg-chrome')
  })

  test('offers one labelled global search field', () => {
    const input = panel().get('input')

    expect(input.attributes('aria-label')).toEqual('Search input')
    expect(input.attributes('placeholder')).toEqual('Search or RSS URL…')
  })

  test('explains itself before anything is typed', () => {
    expect(panel().text()).toContain('Paste an RSS URL')
    expect(panel().findAll('[data-row]')).toHaveLength(0)
  })

  test('offers the URL itself as a feed to open', async () => {
    const wrapper = await searchFor('https://foo.bar/rss.xml')

    expect(wrapper.text()).toContain('Feed found at this URL')
    expect(wrapper.text()).toContain('https://foo.bar/rss.xml')
  })

  test('finds feeds and entries already followed', async () => {
    const wrapper = await searchFor('twitter')

    expect(wrapper.text()).toContain('In your entries')
    expect(wrapper.text()).toContain('Twitter is done. Long live RSS.')
  })

  test('matches a feed by its title', async () => {
    const wrapper = await searchFor('changelog')

    expect(wrapper.text()).toContain('Your feeds')
  })

  test('says so when nothing matches', async () => {
    const wrapper = await searchFor('zzzz')

    expect(wrapper.text()).toContain('Nothing matches')
    expect(wrapper.findAll('[data-row]')).toHaveLength(0)
  })

  test('submits what was typed', async () => {
    const wrapper = await searchFor('https://foo.bar/rss.xml')

    await wrapper.get('form').trigger('submit')

    expect(wrapper.emitted('search').pop()).toEqual(['https://foo.bar/rss.xml'])
  })

  test('closes from the back circle', async () => {
    const wrapper = panel()

    await wrapper.get('[aria-label="Close search"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
