import { mount } from '@vue/test-utils'
import { describe, test, expect, vi } from 'vitest'
import AudioPlayer from './component.vue'

const player = (src) => {
  return mount(AudioPlayer, {
    props: {
      app: { queries: { audioForEntry: () => src }, commands: { keepScreenAwake: vi.fn(), letScreenSleep: vi.fn() } },
      identity: {},
      entry: { id: '1' }
    }
  })
}

describe('AudioPlayer', () => {
  test('plays whatever the entry carries', () => {
    expect(player('https://foo.bar/ep14.mp3').get('audio source').attributes('src'))
      .toEqual('https://foo.bar/ep14.mp3')
  })

  test('is nothing at all for an entry with no audio', () => {
    expect(player(undefined).find('audio').exists()).toBe(false)
  })

  // A feed page mounts one of these per episode and each is a real media
  // element on the device, so nothing is fetched until someone presses play.
  test('asks for none of it up front', () => {
    expect(player('https://foo.bar/ep14.mp3').get('audio').attributes('preload')).toEqual('none')
  })

  // A feed page mounts one of these per episode. The thirty-nine that were
  // never playing must not hand back a screen the one that is playing took.
  test('gives the screen back only if it was the one that took it', async () => {
    const commands = { keepScreenAwake: vi.fn(), letScreenSleep: vi.fn() }
    const wrapper = mount(AudioPlayer, {
      props: {
        app: { queries: { audioForEntry: () => 'https://foo.bar/ep14.mp3' }, commands },
        identity: {},
        entry: { id: '1' }
      }
    })

    wrapper.unmount()
    expect(commands.letScreenSleep).not.toHaveBeenCalled()
  })

  test('gives the screen back when it goes while playing', async () => {
    const commands = { keepScreenAwake: vi.fn(), letScreenSleep: vi.fn() }
    const wrapper = mount(AudioPlayer, {
      props: {
        app: { queries: { audioForEntry: () => 'https://foo.bar/ep14.mp3' }, commands },
        identity: {},
        entry: { id: '1' }
      }
    })

    await wrapper.get('audio').trigger('play')
    expect(commands.keepScreenAwake).toHaveBeenCalled()

    wrapper.unmount()
    expect(commands.letScreenSleep).toHaveBeenCalled()
  })
})
