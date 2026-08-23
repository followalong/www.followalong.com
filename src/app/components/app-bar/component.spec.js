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
    expect(wrapper.get('h1').classes()).toContain('text-title')
    expect(wrapper.get('h1').classes()).toContain('font-extrabold')
    expect(wrapper.text()).toContain('Home')
  })

  test('holds both 34px slots open so the title never shifts', () => {
    const slots = bar().findAll('[data-bar-slot]')

    expect(slots).toHaveLength(2)
    slots.forEach((slot) => {
      expect(slot.classes()).toContain('h-[34px]')
      expect(slot.classes()).toContain('w-[34px]')
    })
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
})
