import { mount } from '@vue/test-utils'
import { describe, test, expect } from 'vitest'
import PipPlayer from './component.vue'

const HISTORY = [
  { id: '1', title: 'Ep. 13 — Feeds for everything', duration: '22:10' },
  { id: '2', title: 'Setting up your first feed', duration: '04:40' }
]

const player = (props) => {
  return mount(PipPlayer, {
    props: { title: 'Setting up your first feed', history: HISTORY, nowPlayingId: '2', ...props }
  })
}

describe('PipPlayer', () => {
  test('floats bottom-right, clear of the mobile tab bar', () => {
    const el = player().get('[data-pip]')

    expect(el.classes()).toContain('fixed')
    expect(el.classes()).toContain('right-3')
    expect(el.classes()).toContain('bottom-[100px]')
    expect(el.classes()).toContain('md:bottom-5')
  })

  test('keeps a 16:9 frame', () => {
    expect(player().get('[data-pip-frame]').classes()).toContain('aspect-video')
  })

  test('emits pause and close from the overlay controls', async () => {
    const wrapper = player()

    await wrapper.get('[data-pip-pause]').trigger('click')
    await wrapper.get('[data-pip-close]').trigger('click')

    expect(wrapper.emitted('pause')).toHaveLength(1)
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  test('keeps the history dropdown shut until the amber hamburger is used', async () => {
    const wrapper = player()

    expect(wrapper.find('[data-pip-history]').exists()).toBe(false)

    await wrapper.get('[data-pip-menu]').trigger('click')

    expect(wrapper.get('[data-pip-history]').text()).toContain('Ep. 13 — Feeds for everything')
  })

  test('marks the current item in the history', async () => {
    const wrapper = player()

    await wrapper.get('[data-pip-menu]').trigger('click')

    const rows = wrapper.findAll('[data-pip-history-item]')

    expect(rows[1].text()).toContain('▶ now')
    expect(rows[0].text()).toContain('22:10')
  })

  test('shows progress in amber', () => {
    const el = player({ progress: 45 }).get('[data-pip-progress]')

    expect(el.attributes('style')).toContain('width: 45%')
    expect(el.classes()).toContain('bg-accent')
  })
})
