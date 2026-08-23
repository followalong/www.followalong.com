import { mount } from '@vue/test-utils'
import { describe, test, expect } from 'vitest'
import NavItem from './component.vue'

const stubs = { RouterLink: { template: '<a><slot /></a>', props: ['to'] } }

const item = (props) => {
  return mount(NavItem, {
    props: { to: '/', label: 'Home', ...props },
    global: { stubs }
  })
}

describe('NavItem', () => {
  test('carries an icon and a small label', () => {
    const wrapper = item()

    expect(wrapper.text()).toContain('Home')
    expect(wrapper.get('[data-nav-label]').classes()).toContain('text-nav')
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  test('meets the touch target on the tab bar', () => {
    expect(item().get('a').classes()).toContain('min-h-touch')
  })

  test('turns the icon amber when active', () => {
    expect(item({ active: true }).get('[data-nav-icon]').classes()).toContain('text-accent')
    expect(item().get('[data-nav-icon]').classes()).not.toContain('text-accent')
  })

  test('adds a pill ground only on the chrome bar', () => {
    expect(item({ active: true, on: 'chrome' }).get('a').classes()).toContain('bg-chrome-deep')
    expect(item({ active: true, on: 'surface' }).get('a').classes()).not.toContain('bg-chrome-deep')
  })

  test('labels against the ground it sits on', () => {
    expect(item({ on: 'chrome' }).get('[data-nav-label]').classes()).toContain('text-white/90')
    expect(item({ on: 'surface' }).get('[data-nav-label]').classes()).toContain('text-ink-subtle')
    expect(item({ on: 'surface', active: true }).get('[data-nav-label]').classes()).toContain('text-primary')
  })
})
