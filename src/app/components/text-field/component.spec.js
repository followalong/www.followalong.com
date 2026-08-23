import { mount } from '@vue/test-utils'
import { describe, test, expect } from 'vitest'
import TextField from './component.vue'

const field = (props, attrs) => mount(TextField, { props, attrs })

describe('TextField', () => {
  test('is one field look, labelled above', () => {
    const wrapper = field({ label: 'Proxy URL' })

    expect(wrapper.get('span').text()).toEqual('Proxy URL')
    expect(wrapper.get('input').classes()).toContain('rounded-field')
    expect(wrapper.get('input').classes()).toContain('border-hairline-strong')
  })

  test('puts labels and ids on the control', () => {
    const wrapper = field({}, { 'aria-label': 'Identity name' })

    expect(wrapper.get('input').attributes('aria-label')).toEqual('Identity name')
    expect(wrapper.get('label').attributes('aria-label')).toBeUndefined()
  })

  test('emits what was typed', async () => {
    const wrapper = field()

    await wrapper.get('input').setValue('hello')

    expect(wrapper.emitted('update:modelValue').pop()).toEqual(['hello'])
  })

  test('grows into a textarea when asked', () => {
    expect(field({ multiline: true }).find('textarea').exists()).toBe(true)
  })

  test('turns the border and hint red when invalid', () => {
    const wrapper = field({ invalid: true, hint: 'That is not a backup' })

    expect(wrapper.get('input').classes()).toContain('border-danger')
    expect(wrapper.text()).toContain('That is not a backup')
  })
})
