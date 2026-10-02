import fs from 'fs'
import path from 'path'
import tailwind from '../../tailwind.config.js'

const read = (file) => fs.readFileSync(path.join(__dirname, file), 'utf8')
const spacing = tailwind.theme.extend.spacing

// The class list of the element carrying `marker`, wherever its attributes sit.
const classesOf = (file, marker) => {
  const tag = read(file).match(/<[^<]+>/g).find((t) => t.includes(marker))

  return tag.match(/class="([^"]*)"/)[1].split(/\s+/)
}

// A phone keeps the status bar at the top of the screen and the home indicator
// at the bottom. The page is drawn under both, so whatever is pinned to an
// edge keeps its own content out of them. jsdom measures nothing: this pins
// the names, and the simulator proves the pixels.
describe('the safe areas', () => {
  it('lets the page reach the edges of the screen, so the insets are real', () => {
    expect(read('../../index.html')).toMatch(/<meta name='viewport' content="[^"]*viewport-fit=cover/)
  })

  it('names the insets once, and grows a gap into one without stacking the two', () => {
    expect(spacing['safe-top']).toEqual('env(safe-area-inset-top, 0px)')
    expect(spacing['safe-bottom']).toEqual('env(safe-area-inset-bottom, 0px)')
    expect(spacing['tab-bar-foot']).toEqual('max(24px, env(safe-area-inset-bottom, 0px))')
    expect(spacing['sheet-foot']).toEqual('max(28px, env(safe-area-inset-bottom, 0px))')
    expect(spacing['tab-bar']).toEqual('calc(76px + max(24px, env(safe-area-inset-bottom, 0px)))')
  })

  it('gives the top inset to the app bar', () => {
    expect(classesOf('components/app-bar/component.vue', '<header')).toEqual(expect.arrayContaining(['sticky', 'top-0', 'pt-safe-top']))
  })

  it('gives the bottom inset to the tab bar', () => {
    const tabBar = classesOf('component.vue', 'on="surface"')

    expect(tabBar).toEqual(expect.arrayContaining(['fixed', 'bottom-0', 'pb-tab-bar-foot']))
    expect(tabBar).not.toContain('pb-6')
  })

  it('ends a page clear of the tab bar', () => {
    expect(classesOf('component.vue', '<main')).toContain('pb-tab-bar')
  })

  it('keeps the player clear of the tab bar', () => {
    expect(classesOf('components/pip-player/component.vue', 'data-pip\n')).toContain('bottom-tab-bar')
  })

  it('keeps search clear of both', () => {
    expect(classesOf('components/search-panel/component.vue', 'data-search-panel')).toContain('pt-safe-top')
    expect(classesOf('components/search-panel/component.vue', 'data-search-results')).toContain('pb-safe-bottom')
  })

  it('keeps the end of a sheet clear of the home indicator, with a footer or without', () => {
    const sheet = read('components/sheet/component.vue')

    expect(classesOf('components/sheet/component.vue', '<footer')).toEqual(expect.arrayContaining(['pt-4', 'pb-sheet-foot']))
    expect(sheet).toContain("$slots.footer ? '' : 'pb-safe-bottom'")
  })
})
