import { mount } from '@vue/test-utils'
import { describe, test, expect } from 'vitest'
import SaveStar from './component.vue'

describe('SaveStar', () => {
  test('matches the DoneCircle it sits beside', () => {
    const el = mount(SaveStar).get('button')

    expect(el.classes()).toContain('h-7')
    expect(el.classes()).toContain('w-7')
  })

  test('reads as unsaved until saved', () => {
    const el = mount(SaveStar, { props: { subject: '6363' } }).get('button')

    expect(el.attributes('aria-pressed')).toEqual('false')
    expect(el.attributes('aria-label')).toEqual('Save 6363')
    expect(el.classes()).toContain('text-inactive')
  })

  test('turns amber once saved', () => {
    const el = mount(SaveStar, { props: { saved: true, subject: '6363' } }).get('button')

    expect(el.attributes('aria-pressed')).toEqual('true')
    expect(el.attributes('aria-label')).toEqual('Unsave 6363')
    expect(el.classes()).toContain('text-accent')
  })

  test('emits toggle when pressed', async () => {
    const wrapper = mount(SaveStar)

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('toggle')).toHaveLength(1)
  })
})
