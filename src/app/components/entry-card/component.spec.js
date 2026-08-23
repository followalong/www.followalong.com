import { mount } from '@vue/test-utils'
import { describe, test, expect } from 'vitest'
import EntryCard from './component.vue'

const card = (props) => {
  return mount(EntryCard, {
    props: { title: 'Twitter is done. Long live RSS.', meta: 'Changelog · 08:27 AM', ...props }
  })
}

describe('EntryCard', () => {
  test('carries a DoneCircle whatever the medium', () => {
    ['text', 'video', 'audio'].forEach((media) => {
      expect(card({ media }).findComponent({ name: 'DoneCircle' }).exists()).toBe(true)
    })
  })

  test('passes the toggle up as done', async () => {
    const wrapper = card()

    await wrapper.findComponent({ name: 'DoneCircle' }).get('button').trigger('click')

    expect(wrapper.emitted('done')).toHaveLength(1)
  })

  test('is full-bleed on mobile and rounded from tablet up', () => {
    const el = card().get('article')

    expect(el.classes()).toContain('rounded-none')
    expect(el.classes()).toContain('md:rounded-card')
  })

  test('shows a summary and a Read full action for text', () => {
    const wrapper = card({ summary: 'It is not just Twitter.', summaryLabel: 'SUMMARY' })

    expect(wrapper.text()).toContain('It is not just Twitter.')
    expect(wrapper.text()).toContain('SUMMARY')
    expect(wrapper.get('[data-read-full]').text()).toEqual('Read full')
  })

  test('earns the SUMMARY badge only when an add-on wrote it', () => {
    expect(card({ summary: 'A preview of the entry.' }).text()).not.toContain('SUMMARY')
  })

  test('leads with a 16:9 frame for video', () => {
    const wrapper = card({ media: 'video' })

    expect(wrapper.get('[data-media-lead]').classes()).toContain('aspect-video')
    expect(card({ media: 'text' }).find('[data-media-lead]').exists()).toBe(false)
  })

  test('carries a progress bar for audio', () => {
    const wrapper = card({ media: 'audio', progress: 30 })

    expect(wrapper.get('[data-progress-fill]').attributes('style')).toContain('width: 30%')
    expect(wrapper.get('[data-progress-fill]').classes()).toContain('bg-accent')
  })

  test('emits play for a playable medium', async () => {
    const wrapper = card({ media: 'audio' })

    await wrapper.get('[data-play]').trigger('click')

    expect(wrapper.emitted('play')).toHaveLength(1)
  })
})
