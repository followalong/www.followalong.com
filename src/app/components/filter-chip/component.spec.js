import { mount } from '@vue/test-utils'
import { describe, test, expect } from 'vitest'
import FilterChip from './component.vue'

const chip = (props) => {
  return mount(FilterChip, { props, slots: { default: 'Watch' } })
}

describe('FilterChip', () => {
  test('is an outlined pill when unselected', () => {
    const el = chip().get('span')

    expect(el.classes()).toContain('rounded-pill')
    expect(el.classes()).toContain('border-hairline-outline')
    expect(chip().get('button').attributes('aria-pressed')).toEqual('false')
  })

  test('fills with teal when selected', () => {
    const el = chip({ selected: true }).get('span')

    expect(el.classes()).toContain('bg-primary')
    expect(el.classes()).toContain('text-white')
    expect(chip({ selected: true }).get('button').attributes('aria-pressed')).toEqual('true')
  })

  test('emits select when pressed', async () => {
    const wrapper = chip()

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('select')).toHaveLength(1)
  })
})
