import { mount } from '@vue/test-utils'
import { describe, test, expect } from 'vitest'
import SignalChips from './component.vue'

const SIGNALS = [
  { id: 'a', permalink: 'home', title: 'Home', unread: 8 },
  { id: 'b', permalink: 'read', title: 'Read' },
  { id: 'c', permalink: 'done', title: 'Done' }
]

const app = {
  queries: {
    signalsForIdentity: () => SIGNALS,
    permalinkForSignal: (signal) => signal.permalink,
    titleForSignal: (signal) => signal.title,
    unreadEntriesForSignalLength: (identity, signal) => signal.unread || 0
  }
}

const chips = (permalink = 'home') => {
  const push = []

  const wrapper = mount(SignalChips, {
    props: { app, identity: {}, current: permalink },
    global: { mocks: { $router: { push: (to) => push.push(to) } } }
  })

  wrapper.push = push

  return wrapper
}

describe('SignalChips', () => {
  test('offers one chip per signal', () => {
    expect(chips().findAllComponents({ name: 'FilterChip' })).toHaveLength(3)
  })

  test('labels each chip so it can be reached by name', () => {
    expect(chips().get('[aria-label="Visit Read"]').text()).toEqual('Read')
  })

  test('selects the chip for the signal being shown', () => {
    const selected = chips('read').findAllComponents({ name: 'FilterChip' })
      .filter((chip) => chip.props('selected'))

    expect(selected).toHaveLength(1)
    expect(selected[0].text()).toEqual('Read')
  })

  test('navigates to the signal when a chip is chosen', async () => {
    const wrapper = chips()

    await wrapper.get('[aria-label="Visit Done"]').trigger('click')

    expect(wrapper.push).toEqual(['/signals/done'])
  })

  test('shows how much is waiting, and nothing when nothing is', () => {
    const counts = chips().findAll('[data-chip-count]')

    expect(counts).toHaveLength(1)
    expect(counts[0].text()).toEqual('8')
  })
})
