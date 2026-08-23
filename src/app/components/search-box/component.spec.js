import { mount } from '@vue/test-utils'
import { describe, test, expect } from 'vitest'
import SearchBox from './component.vue'

describe('SearchBox', () => {
  test('offers the global placeholder by default', () => {
    expect(mount(SearchBox).get('input').attributes('placeholder')).toEqual('Search or RSS URL…')
  })

  test('offers the scoped placeholder when filtering a list', () => {
    const el = mount(SearchBox, { props: { scope: 'scoped' } }).get('input')

    expect(el.attributes('placeholder')).toEqual('Filter these entries…')
  })

  test('has only the two sanctioned placeholders', () => {
    expect(SearchBox.props.scope.validator('global')).toBe(true)
    expect(SearchBox.props.scope.validator('scoped')).toBe(true)
    expect(SearchBox.props.scope.validator('anything-else')).toBe(false)
  })

  test('is always the same white rounded field', () => {
    const el = mount(SearchBox, { props: { scope: 'scoped' } }).get('label')

    expect(el.classes()).toContain('bg-white')
    expect(el.classes()).toContain('rounded-field')
    expect(el.classes()).toContain('border-hairline-strong')
  })

  test('emits its value as you type', async () => {
    const wrapper = mount(SearchBox)

    await wrapper.get('input').setValue('changelog')

    expect(wrapper.emitted('update:modelValue').pop()).toEqual(['changelog'])
  })
})
