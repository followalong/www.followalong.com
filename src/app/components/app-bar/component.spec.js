import { mount } from '@vue/test-utils'
import { describe, test, expect } from 'vitest'
import AppBar from './component.vue'

const bar = (options = {}) => {
  return mount(AppBar, {
    props: { title: 'Home', ...options.props },
    slots: options.slots,
    global: { stubs: { RouterLink: { template: '<a><slot /></a>', props: ['to'] } } }
  })
}

describe('AppBar', () => {
  test('is the teal bar with an 800-weight title', () => {
    const wrapper = bar()

    expect(wrapper.get('header').classes()).toContain('bg-chrome')
    // Stays put while the river scrolls under it.
    expect(wrapper.get('header').classes()).toContain('sticky')
    expect(wrapper.get('header').classes()).toContain('top-0')
    expect(wrapper.get('h1').classes()).toContain('text-title')
    expect(wrapper.get('h1').classes()).toContain('font-semibold')
    expect(wrapper.text()).toContain('Home')
  })

  test('keeps the action slot open so the title never shifts', () => {
    const slot = bar().get('[data-bar-slot]')

    expect(slot.classes()).toContain('h-slot')
    expect(slot.classes()).toContain('w-slot')
  })

  test('makes the logo and title one target, the height of the bar', () => {
    const home = bar().get('[data-bar-home]')

    expect(home.find('[data-bar-logo]').exists()).toBe(true)
    expect(home.find('h1').exists()).toBe(true)
    expect(home.classes()).toContain('flex-1')
    expect(home.classes()).toContain('min-w-0')
  })

  test('shows the logo mark on a top-level page', () => {
    expect(bar().find('[data-bar-back]').exists()).toBe(false)
    expect(bar().find('[data-bar-logo]').exists()).toBe(true)
  })

  test('swaps the logo for a back circle on a sub-page', () => {
    const wrapper = bar({ props: { back: '/following' } })

    expect(wrapper.find('[data-bar-logo]').exists()).toBe(false)
    expect(wrapper.get('[data-bar-back]').attributes('aria-label')).toEqual('Back')
  })

  test('fills the right slot from the action slot', () => {
    const wrapper = bar({ slots: { action: '<button>Add</button>' } })

    expect(wrapper.text()).toContain('Add')
  })

  test('is one height on every page, logo or back circle', () => {
    const row = (props) => bar({ props }).get('header').element.firstElementChild

    expect(row().className).toContain('h-bar')
    expect(row({ back: '/following' }).className).toContain('h-bar')
  })
})
