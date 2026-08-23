import { mount } from '@vue/test-utils'
import { describe, test, expect } from 'vitest'
import DoneCircle from './component.vue'

describe('DoneCircle', () => {
  test('is a 28px check circle', () => {
    const el = mount(DoneCircle).get('button')

    expect(el.classes()).toContain('h-7')
    expect(el.classes()).toContain('w-7')
    expect(el.classes()).toContain('rounded-full')
    expect(el.text()).toContain('✓')
  })

  test('reads as unmarked until done', () => {
    const el = mount(DoneCircle).get('button')

    expect(el.classes()).toContain('border-inactive')
    expect(el.attributes('aria-pressed')).toEqual('false')
    expect(el.attributes('aria-label')).toEqual('Mark as read')
  })

  test('fills with the following colour once done', () => {
    const el = mount(DoneCircle, { props: { done: true } }).get('button')

    expect(el.classes()).toContain('bg-following')
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
