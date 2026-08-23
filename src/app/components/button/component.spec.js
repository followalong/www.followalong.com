import { mount } from '@vue/test-utils'
import { describe, test, expect } from 'vitest'
import Button from './component.vue'

const classesFor = (variant) => {
  return mount(Button, { props: { variant }, slots: { default: 'Save' } }).get('button').classes()
}

describe('Button', () => {
  test('is primary by default', () => {
    const el = mount(Button, { slots: { default: 'Save' } }).get('button')

    expect(el.classes()).toContain('bg-primary')
    expect(el.classes()).toContain('text-white')
    expect(el.text()).toEqual('Save')
  })

  test('draws secondary as an outline', () => {
    expect(classesFor('secondary')).toContain('border-hairline-outline')
    expect(classesFor('secondary')).toContain('text-ink-body')
  })

  test('draws destructive on its own tinted ground', () => {
    expect(classesFor('destructive')).toContain('bg-danger-bg')
    expect(classesFor('destructive')).toContain('text-danger')
  })

  test('has only the three sanctioned variants', () => {
    expect(Button.props.variant.validator('primary')).toBe(true)
    expect(Button.props.variant.validator('secondary')).toBe(true)
    expect(Button.props.variant.validator('destructive')).toBe(true)
    expect(Button.props.variant.validator('ghost')).toBe(false)
  })

  test('emits click', async () => {
    const wrapper = mount(Button, { slots: { default: 'Save' } })

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('click')).toHaveLength(1)
  })
})
