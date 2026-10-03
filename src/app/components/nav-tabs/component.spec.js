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

const lit = (path) => tabs(path).findAllComponents({ name: 'NavItem' })
  .filter((item) => item.props('active'))
  .map((item) => item.props('label'))

describe('NavTabs', () => {
  test('offers exactly the four destinations', () => {
    expect(DESTINATIONS.map((d) => d.label)).toEqual(['Home', 'Feeds', 'Saved', 'You'])
    expect(tabs().findAllComponents({ name: 'NavItem' })).toHaveLength(4)
  })

  test('marks the destination matching the route', () => {
    expect(lit('/following')).toEqual(['Feeds'])
    expect(lit('/signals/saved')).toEqual(['Saved'])
  })

  test('treats a feed page as Feeds', () => {
    expect(lit('/https://changelog.followalong.com/feed.xml')).toEqual(['Feeds'])
  })

  // Every page reached from You keeps You lit, so the way back is visible.
  test('treats the pages under You as You', () => {
    ['/help', '/about', '/terms', '/privacy', '/storage', '/marketplace', '/add-ons'].forEach((path) => {
      expect(lit(path)).toEqual(['You'])
    })
  })

  test('keeps Home active on the river and its signals, not on Saved', () => {
    expect(lit('/')).toEqual(['Home'])
    expect(lit('/signals/home')).toEqual(['Home'])
    expect(lit('/signals/watch')).toEqual(['Home'])
    expect(lit('/settings')).toEqual(['You'])
  })

  test('passes the ground through to every item', () => {
    tabs('/', { on: 'chrome' }).findAllComponents({ name: 'NavItem' }).forEach((item) => {
      expect(item.props('on')).toEqual('chrome')
    })
  })
})
