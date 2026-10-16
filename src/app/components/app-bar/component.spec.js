import { mount } from '@vue/test-utils'
import { describe, test, expect } from 'vitest'
import AppBar from './component.vue'

const bar = (options = {}) => {
  return mount(AppBar, {
    props: { title: 'Home', ...options.props },
    slots: options.slots,
    global: { stubs: { RouterLink: { template: '<a :href="to"><slot /></a>', props: ['to'] } } }
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

  // A minimum rather than a fixed width: a page that contributes its own
  // control puts two in here, and the reservation still holds the title's
  // starting point for the pages that do not.
  test('keeps the action slot open so the title never shifts', () => {
    const slot = bar().get('[data-bar-slot]')

    expect(slot.classes()).toContain('h-slot')
    expect(slot.classes()).toContain('min-w-slot')
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

  // The back circle used to take the logo's place, so on a feed page a tap
  // where the logo always is went to the feeds list instead of home.
  test('adds a back circle on a sub-page and keeps the logo', () => {
    const wrapper = bar({ props: { back: '/following' } })

    expect(wrapper.get('[data-bar-back]').attributes('aria-label')).toEqual('Back')
    expect(wrapper.find('[data-bar-logo]').exists()).toBe(true)
  })

  test('sends the logo and title home from every page, and Back where the page says', () => {
    const wrapper = bar({ props: { back: '/following' } })

    expect(wrapper.get('[data-bar-home]').attributes('href')).toEqual('/')
    expect(wrapper.get('[data-bar-back]').attributes('href')).toEqual('/following')
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
