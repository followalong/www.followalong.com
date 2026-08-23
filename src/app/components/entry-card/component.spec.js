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

  test('spans the column, edge to edge', () => {
    const el = card().get('article')

    expect(el.classes()).toContain('rounded-none')
    expect(el.classes()).toContain('border-b')
  })

  test('shows a summary for text', () => {
    const wrapper = card({ summary: 'It is not just Twitter.', summaryLabel: 'SUMMARY' })

    expect(wrapper.text()).toContain('It is not just Twitter.')
    expect(wrapper.text()).toContain('SUMMARY')
  })

  test('wears the summary badge as a pill', () => {
    const badge = card({ summary: 'A summary.', summaryLabel: 'SUMMARY' }).get('[data-summary-badge]')

    expect(badge.classes()).toContain('rounded-pill')
    expect(badge.classes()).toContain('bg-accent-tint')
  })

  test('earns the SUMMARY badge only when an add-on wrote it', () => {
    expect(card({ summary: 'A preview of the entry.' }).find('[data-summary-badge]').exists()).toBe(false)
  })

  test('opens the reader from the title and the summary, with no button', async () => {
    const wrapper = card({ summary: 'A summary.', readable: true, subject: '6363' })

    expect(wrapper.find('[data-read-full]').exists()).toBe(false)

    await wrapper.get('[aria-label="Toggle entry content 6363"]').trigger('click')
    await wrapper.get('[data-summary]').trigger('click')

    expect(wrapper.emitted('read')).toHaveLength(2)
  })

  test('leaves the text inert when there is nothing to read', () => {
    const wrapper = card({ summary: 'A summary.' })

    expect(wrapper.find('[aria-label^="Toggle entry content"]').exists()).toBe(false)
    expect(wrapper.get('[data-summary]').element.tagName).toEqual('DIV')
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

  test('steps back once it is done', () => {
    expect(card({ done: true }).get('article').classes()).toContain('opacity-70')
    expect(card().get('article').classes()).not.toContain('opacity-70')
  })
})
