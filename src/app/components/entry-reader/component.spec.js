import { mount } from '@vue/test-utils'
import { describe, test, expect } from 'vitest'
import EntryReader from './component.vue'

const reader = (props) => {
  return mount(EntryReader, {
    props: {
      open: true,
      entryId: '6363',
      title: 'Twitter is done. Long live RSS.',
      meta: 'Changelog · 08:27 AM',
      content: '<p>It is not just Twitter.</p>',
      ...props
    },
    attachTo: document.body
  })
}

describe('EntryReader', () => {
  test('stays shut until opened', () => {
    expect(reader({ open: false }).find('[data-sheet]').exists()).toBe(false)
  })

  test('sets the content in the reading serif', () => {
    const body = reader().get('[aria-label="Content for 6363"]')

    expect(body.classes()).toContain('prose')
    expect(body.html()).toContain('It is not just Twitter.')
  })

  test('offers Done, Skip and Source', async () => {
    const wrapper = reader({ link: 'https://example.com/post' })

    expect(wrapper.get('[data-reader-source]').attributes('href')).toEqual('https://example.com/post')

    await wrapper.get('[data-reader-done]').trigger('click')
    await wrapper.get('[data-reader-skip]').trigger('click')

    expect(wrapper.emitted('done')).toHaveLength(1)
    expect(wrapper.emitted('skip')).toHaveLength(1)
  })

  test('drops Source when the entry has no link', () => {
    expect(reader().find('[data-reader-source]').exists()).toBe(false)
  })

  test('closes from the sheet', async () => {
    const wrapper = reader()

    await wrapper.get('[data-sheet-close]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
