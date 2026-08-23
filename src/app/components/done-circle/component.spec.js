import { mount } from '@vue/test-utils'
import { describe, test, expect } from 'vitest'
import DoneCircle from './component.vue'

describe('DoneCircle', () => {
  test('is a 28px check circle', () => {
    const el = mount(DoneCircle).get('button')

    expect(el.classes()).toContain('h-7')
    expect(el.classes()).toContain('w-7')
    expect(el.get('svg').classes()).toContain('h-icon')
    expect(el.get('svg').attributes('viewBox')).toEqual('0 0 20 20')
  })

  test('reads as unmarked until done', () => {
    const el = mount(DoneCircle).get('button')

    expect(el.classes()).toContain('text-inactive')
    expect(el.attributes('aria-pressed')).toEqual('false')
    expect(el.attributes('aria-label')).toEqual('Mark as read')
  })

  test('fills with the following colour once done', () => {
    const el = mount(DoneCircle, { props: { done: true } }).get('button')

    expect(el.classes()).toContain('text-following')
    expect(el.attributes('aria-pressed')).toEqual('true')
    expect(el.attributes('aria-label')).toEqual('Mark as unread')
  })

  test('names its subject so several circles stay distinct', () => {
    const el = mount(DoneCircle, { props: { subject: '6363' } }).get('button')

    expect(el.attributes('aria-label')).toEqual('Mark as read 6363')
  })

  test('emits toggle when pressed', async () => {
    const wrapper = mount(DoneCircle)

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('toggle')).toHaveLength(1)
  })
})
