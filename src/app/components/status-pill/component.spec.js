import { mount } from '@vue/test-utils'
import { describe, test, expect } from 'vitest'
import StatusPill from './component.vue'

const classesFor = (status) => {
  return mount(StatusPill, {
    props: { status },
    slots: { default: 'Label' }
  }).get('span').classes()
}

describe('StatusPill', () => {
  test('is a pill carrying its label', () => {
    const el = mount(StatusPill, { slots: { default: 'Following' } }).get('span')

    expect(el.classes()).toContain('rounded-pill')
    expect(el.text()).toEqual('Following')
  })

  test('themes Following and Installed as green', () => {
    expect(classesFor('following')).toContain('bg-following-bg')
    expect(classesFor('following')).toContain('text-following')
    expect(classesFor('installed')).toContain('bg-following-bg')
  })

  test('themes neutral states as sunken grey', () => {
    expect(classesFor('paused')).toContain('bg-surface-sunken')
    expect(classesFor('paused')).toContain('text-ink-muted')
    expect(classesFor('tag')).toContain('bg-surface-sunken')
  })

  test('themes a needs-proxy feed as a warning', () => {
    expect(classesFor('warning')).toContain('text-warning')
  })
})
