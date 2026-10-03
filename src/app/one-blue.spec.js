import tailwind from '../../tailwind.config.js'

const { chrome, primary } = tailwind.theme.extend.colors

// The app wears one blue: the icon's, which is the bar's. Links and buttons
// on white use the same value, so nothing on screen is "almost" the icon.
describe('the blue', () => {
  it('is the same for the bars, the actions and the icon', () => {
    expect(primary.DEFAULT).toBe(chrome.DEFAULT)
  })
})
