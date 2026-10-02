import sanitizeContent from './presenters/sanitize-content.js'

// Feed content is drawn inside the app. The native shell has one webview, and
// anything that loads over the app there leaves no way back.
describe('sanitizeContent', () => {
  it('opens a link outside the app', () => {
    expect(sanitizeContent('<a href="https://example.com/">out</a>')).toContain('target="_blank"')
  })

  it('opens an image map and a form outside the app', () => {
    expect(sanitizeContent('<map><area href="https://example.com/"></map>')).toContain('target="_blank"')
    expect(sanitizeContent('<form action="https://example.com/"><button>Go</button></form>')).toContain('target="_blank"')
  })

  it('drops what would send the page elsewhere by itself', () => {
    const html = sanitizeContent('<meta http-equiv="refresh" content="0;url=https://example.com/"><base href="https://example.com/"><p>kept</p>')

    expect(html).toEqual('<p>kept</p>')
  })

  it('still drops scripts and styles', () => {
    expect(sanitizeContent('<script>1</script><style>p{}</style><p style="color:red" class="x">kept</p>')).toEqual('<p>kept</p>')
  })
})
