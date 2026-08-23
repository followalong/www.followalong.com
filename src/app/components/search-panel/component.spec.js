import { mount } from '@vue/test-utils'
import { describe, test, expect } from 'vitest'
import SearchPanel from './component.vue'

const panel = () => mount(SearchPanel)

describe('SearchPanel', () => {
  test('takes the screen over with the chrome bar', () => {
    expect(panel().get('[data-search-panel]').classes()).toContain('bg-chrome')
  })

  test('offers one labelled global search field', () => {
    const input = panel().get('input')

    expect(input.attributes('aria-label')).toEqual('Search input')
    expect(input.attributes('placeholder')).toEqual('Search or RSS URL…')
  })

  test('submits what was typed', async () => {
    const wrapper = panel()

    await wrapper.get('input').setValue('https://foo.bar/rss.xml')
    await wrapper.get('form').trigger('submit')

    expect(wrapper.emitted('search').pop()).toEqual(['https://foo.bar/rss.xml'])
  })

  test('closes from the back circle', async () => {
    const wrapper = panel()

    await wrapper.get('[aria-label="Close search"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
