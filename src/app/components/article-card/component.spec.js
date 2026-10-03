import { mount } from '@vue/test-utils'
import { describe, test, expect } from 'vitest'
import ArticleCard from './component.vue'

const PARTS = [
  { title: 'First', body: ['One.', 'Two.'] },
  { title: 'Second', body: ['Three.'] }
]

describe('ArticleCard', () => {
  test('renders each part as a titled section', () => {
    const wrapper = mount(ArticleCard, { props: { parts: PARTS } })

    expect(wrapper.findAll('h2').map((h) => h.text())).toEqual(['First', 'Second'])
    expect(wrapper.findAll('p')).toHaveLength(3)
  })

  test('rules between sections, not above the first', () => {
    const sections = mount(ArticleCard, { props: { parts: PARTS } }).findAll('section')

    expect(sections[0].classes()).not.toContain('border-t')
    expect(sections[1].classes()).toContain('border-t')
  })
})
