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

  test('holds the page still while it is open', () => {
    const wrapper = sheet()

    expect(document.body.style.overflow).toEqual('hidden')

    wrapper.unmount()

    expect(document.body.style.overflow).toEqual('')
  })

  test('takes focus when it opens', async () => {
    const wrapper = sheet()

    await wrapper.vm.$nextTick()

    expect(wrapper.get('[data-sheet]').element.contains(document.activeElement)).toBe(true)
  })

  test('closes on escape from anywhere, not just the scrim', async () => {
    const wrapper = sheet()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  describe('swiping the handle down', () => {
    const drag = async (wrapper, distance) => {
      const handle = wrapper.get('[data-sheet-handle]')

      await handle.trigger('pointerdown', { clientY: 0, pointerId: 1 })
      await handle.trigger('pointermove', { clientY: distance })
      await handle.trigger('pointerup', { clientY: distance })
    }

    const offset = (wrapper) => wrapper.get('[data-sheet]').attributes('style') || ''

    test('follows the finger down', async () => {
      const wrapper = sheet()

      await wrapper.get('[data-sheet-handle]').trigger('pointerdown', { clientY: 0, pointerId: 1 })
      await wrapper.get('[data-sheet-handle]').trigger('pointermove', { clientY: 90 })

      expect(offset(wrapper)).toContain('translateY(90px)')
    })

    // Dragging up would lift the sheet off the bottom of the screen and show
    // the page through the gap.
    test('does not follow it up', async () => {
      const wrapper = sheet()

      await wrapper.get('[data-sheet-handle]').trigger('pointerdown', { clientY: 0, pointerId: 1 })
      await wrapper.get('[data-sheet-handle]').trigger('pointermove', { clientY: -90 })

      expect(offset(wrapper)).toContain('translateY(0px)')
    })

    test('closes when dragged far enough', async () => {
      const wrapper = sheet()

      await drag(wrapper, 120)

      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    test('snaps back from a drag too short to mean it', async () => {
      const wrapper = sheet()

      await drag(wrapper, 20)

      expect(wrapper.emitted('close')).toBeUndefined()
      expect(offset(wrapper)).toContain('translateY(0px)')
    })

    test('ignores a move that no press started', async () => {
      const wrapper = sheet()

      await wrapper.get('[data-sheet-handle]').trigger('pointermove', { clientY: 200 })

      expect(offset(wrapper)).not.toContain('translateY(200px)')
    })

    // A drag the browser takes over — a system gesture, a lost pointer — has
    // to put the sheet back rather than leave it stranded mid-screen.
    test('puts it back when the drag is cancelled', async () => {
      const wrapper = sheet()

      await wrapper.get('[data-sheet-handle]').trigger('pointerdown', { clientY: 0, pointerId: 1 })
      await wrapper.get('[data-sheet-handle]').trigger('pointermove', { clientY: 150 })
      await wrapper.get('[data-sheet-handle]').trigger('pointercancel')

      expect(wrapper.emitted('close')).toBeUndefined()
      expect(offset(wrapper)).toContain('translateY(0px)')
    })
  })

  test('gives focus back to whatever opened it', async () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()

    const wrapper = sheet()
    await wrapper.vm.$nextTick()
    await wrapper.setProps({ open: false })
    await wrapper.vm.$nextTick()

    expect(document.activeElement).toBe(opener)

    opener.remove()
  })
})
