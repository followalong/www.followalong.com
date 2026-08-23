import { mount } from '@vue/test-utils'
import { describe, test, expect } from 'vitest'
import ListRow from './component.vue'

const stubs = { RouterLink: { template: '<a><slot /></a>', props: ['to'] } }

const row = (options = {}) => {
  return mount(ListRow, {
    props: { title: 'Changelog', ...options.props },
    slots: options.slots,
    global: { stubs }
  })
}

describe('ListRow', () => {
  test('is a white row on a hairline divider', () => {
    const el = row().get('[data-row]')

    expect(el.classes()).toContain('bg-white')
    expect(el.classes()).toContain('border-hairline-soft')
    expect(el.text()).toContain('Changelog')
  })

  test('shows meta under the title', () => {
    expect(row({ props: { meta: '10 items' } }).text()).toContain('10 items')
  })

  test('renders as a link when given a destination', () => {
    expect(row({ props: { to: '/feeds/1' } }).find('a').exists()).toBe(true)
    expect(row().find('a').exists()).toBe(false)
  })

  test('shows the trailing chevron only when it leads somewhere', () => {
    expect(row({ props: { to: '/feeds/1' } }).find('[data-row-chevron]').exists()).toBe(true)
    expect(row().find('[data-row-chevron]').exists()).toBe(false)
  })

  test('dims a muted row', () => {
    expect(row({ props: { muted: true } }).get('[data-row]').classes()).toContain('opacity-80')
  })

  test('takes a leading slot', () => {
    expect(row({ slots: { leading: '<img alt="icon">' } }).find('img').exists()).toBe(true)
  })

  test('becomes a labelled button when it performs an action', async () => {
    const wrapper = row({ props: { action: true, ariaLabel: 'Forget identity' } })

    expect(wrapper.get('button').attributes('aria-label')).toEqual('Forget identity')

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('click')).toHaveLength(1)
  })
})
