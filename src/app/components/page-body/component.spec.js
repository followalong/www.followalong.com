import { mount } from '@vue/test-utils'
import { describe, test, expect } from 'vitest'
import PageBody from './component.vue'

const body = (props) => mount(PageBody, { props, slots: { default: 'Page' } })

describe('PageBody', () => {
  test('stacks its cards with room to breathe', () => {
    const el = body().get('[data-page-body]')

    expect(el.classes()).toContain('flex-col')
    expect(el.classes()).toContain('gap-4')
  })

  test('closes the gaps when the cards should touch', () => {
    const el = body({ gapless: true }).get('[data-page-body]')

    expect(el.classes()).toContain('gap-0')
    expect(el.classes()).not.toContain('gap-4')
  })
})
