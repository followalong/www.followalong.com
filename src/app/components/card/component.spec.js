import { mount } from '@vue/test-utils'
import { describe, test, expect } from 'vitest'
import Card from './component.vue'

const card = (props) => mount(Card, { props, slots: { default: 'Body' } })

describe('Card', () => {
  test('is full-bleed on a phone and rounded from tablet up', () => {
    const el = card().get('[data-card]')

    expect(el.classes()).toContain('border-y')
    expect(el.classes()).toContain('md:border')
    expect(el.classes()).toContain('md:rounded-card')
  })

  test('pads its own content by default', () => {
    expect(card().get('[data-card]').classes()).toContain('p-4')
  })

  test('yields padding to rows that bring their own', () => {
    const el = card({ padded: false }).get('[data-card]')

    expect(el.classes()).not.toContain('p-4')
    expect(el.classes()).toContain('overflow-hidden')
  })

  test('carries the tones states need', () => {
    expect(card({ tone: 'danger' }).get('[data-card]').classes()).toContain('bg-danger-bg')
    expect(card({ tone: 'success' }).get('[data-card]').classes()).toContain('bg-following-bg')
    expect(Card.props.tone.validator('nope')).toBe(false)
  })

  test('can be another element when the page needs one', () => {
    expect(card({ as: 'article' }).get('article').exists()).toBe(true)
  })
})
