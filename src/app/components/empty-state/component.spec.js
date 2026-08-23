import { mount } from '@vue/test-utils'
import { describe, test, expect } from 'vitest'
import EmptyState from './component.vue'

describe('EmptyState', () => {
  test('says what is not here', () => {
    const wrapper = mount(EmptyState, { slots: { default: 'Nothing yet.' } })

    expect(wrapper.get('[data-empty-state]').text()).toContain('Nothing yet.')
  })

  test('offers a way out when there is one', () => {
    const wrapper = mount(EmptyState, {
      slots: { default: 'Nothing yet.', action: '<button>Add one</button>' }
    })

    expect(wrapper.get('button').text()).toEqual('Add one')
  })

  test('leaves the action out when there is not', () => {
    expect(mount(EmptyState, { slots: { default: 'x' } }).find('button').exists()).toBe(false)
  })
})
