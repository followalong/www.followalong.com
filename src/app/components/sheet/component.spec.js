import { mount } from '@vue/test-utils'
import { describe, test, expect } from 'vitest'
import Sheet from './component.vue'

const sheet = (options = {}) => {
  return mount(Sheet, {
    props: { open: true, title: 'CORSAnywhere Proxy', ...options.props },
    slots: options.slots,
    attachTo: document.body
  })
}

describe('Sheet', () => {
  test('renders nothing while closed', () => {
    expect(sheet({ props: { open: false } }).find('[data-sheet]').exists()).toBe(false)
  })

  test('dims the app behind it', () => {
    expect(sheet().get('[data-sheet-scrim]').classes()).toContain('bg-chrome/70')
  })

  test('is a rounded-top surface with a centred grabber', () => {
    const wrapper = sheet()

    expect(wrapper.get('[data-sheet]').classes()).toContain('rounded-t-sheet')
    expect(wrapper.get('[data-sheet]').classes()).toContain('bg-surface-sheet')
    expect(wrapper.get('[data-sheet-grabber]').classes()).toContain('mx-auto')
  })

  test('closes from the ✕', async () => {
    const wrapper = sheet()

    await wrapper.get('[data-sheet-close]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  test('closes on escape', async () => {
    const wrapper = sheet()

    await wrapper.get('[data-sheet-scrim]').trigger('keydown', { key: 'Escape' })

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  test('takes body and footer slots', () => {
    const wrapper = sheet({ slots: { default: '<p>Body</p>', footer: '<button>Save</button>' } })

    expect(wrapper.text()).toContain('Body')
    expect(wrapper.text()).toContain('Save')
  })
})
