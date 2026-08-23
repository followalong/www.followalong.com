import { mount } from '@vue/test-utils'
import { describe, test, expect } from 'vitest'
import PageBody from './component.vue'

const body = (props) => mount(PageBody, { props, slots: { default: 'Page' } })

describe('PageBody', () => {
  test('sits on the reading column by default', () => {
    expect(body().get('[data-page-body]').classes()).toContain('max-w-river')
  })

  test('offers the wider and narrower columns the app uses', () => {
    expect(body({ width: 'app' }).get('[data-page-body]').classes()).toContain('max-w-app')
    expect(body({ width: 'panel' }).get('[data-page-body]').classes()).toContain('max-w-panel')
    expect(PageBody.props.width.validator('nope')).toBe(false)
  })

  test('closes the gaps on a phone when the cards should touch', () => {
    const el = body({ gapless: true }).get('[data-page-body]')

    expect(el.classes()).toContain('gap-0')
    expect(el.classes()).toContain('md:gap-3.5')
  })
})
