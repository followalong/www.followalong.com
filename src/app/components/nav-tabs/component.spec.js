import { mount } from '@vue/test-utils'
import { describe, test, expect } from 'vitest'
import NavTabs from './component.vue'
import { DESTINATIONS } from './destinations.js'

const stubs = { RouterLink: { template: '<a :href="to"><slot /></a>', props: ['to'] } }

const tabs = (path = '/', props = {}) => {
  return mount(NavTabs, {
    props,
    global: { stubs, mocks: { $route: { path } } }
  })
}

describe('NavTabs', () => {
  test('offers exactly the four destinations', () => {
    expect(DESTINATIONS.map((d) => d.label)).toEqual(['Home', 'Feeds', 'Marketplace', 'You'])
    expect(tabs().findAllComponents({ name: 'NavItem' })).toHaveLength(4)
  })

  test('marks the destination matching the route', () => {
    const active = tabs('/marketplace').findAllComponents({ name: 'NavItem' })
      .filter((item) => item.props('active'))

    expect(active).toHaveLength(1)
    expect(active[0].props('label')).toEqual('Marketplace')
  })

  test('treats a feed page as Feeds', () => {
    const active = tabs('/https://changelog.followalong.com/feed.xml')
      .findAllComponents({ name: 'NavItem' }).filter((item) => item.props('active'))

    expect(active[0].props('label')).toEqual('Feeds')
  })

  test('keeps Home active only on the river itself', () => {
    expect(tabs('/').findAllComponents({ name: 'NavItem' })[0].props('active')).toBe(true)
    expect(tabs('/settings').findAllComponents({ name: 'NavItem' })[0].props('active')).toBe(false)
  })

  test('passes the ground through to every item', () => {
    tabs('/', { on: 'chrome' }).findAllComponents({ name: 'NavItem' }).forEach((item) => {
      expect(item.props('on')).toEqual('chrome')
    })
  })

  test('shortens Marketplace on the chrome bar where space is tight', () => {
    expect(tabs('/', { on: 'chrome' }).text()).toContain('Market')
    expect(tabs('/', { on: 'surface' }).text()).toContain('Marketplace')
  })
})
