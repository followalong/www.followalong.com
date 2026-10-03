import sanitizeContent from './presenters/sanitize-content.js'

// Feed content is drawn inside the app. The native shell has one webview, and
// anything that loads over the app there leaves no way back.
describe('sanitizeContent', () => {
  it('opens a link outside the app', () => {
    expect(sanitizeContent('<a href="https://example.com/">out</a>')).toContain('target="_blank"')
  })

  it('opens an image map outside the app', () => {
    expect(sanitizeContent('<map><area href="https://example.com/"></map>')).toContain('target="_blank"')
  })

  it('drops what would send the page elsewhere by itself', () => {
    const html = sanitizeContent('<meta http-equiv="refresh" content="0;url=https://example.com/"><base href="https://example.com/"><p>kept</p>')

    expect(html).toEqual('<p>kept</p>')
  })

  it('still drops scripts and styles', () => {
    expect(sanitizeContent('<script>1</script><style>p{}</style><p style="color:red" class="x">kept</p>')).toEqual('<p>kept</p>')
  })
})

// Feed HTML runs in the app's origin, where the bucket keys and the hosted
// token live. Nothing in it may run.
describe('sanitizeContent as a boundary', () => {
  it('drops every handler attribute, however it is spelt', () => {
    expect(sanitizeContent('<img src="https://example.com/x.png" onerror="alert(1)" OnLoad="alert(2)" alt="pic">')).toEqual('<img src="https://example.com/x.png" alt="pic">')
    expect(sanitizeContent('<p onmouseover="alert(1)" onclick=alert(1)>text</p>')).toEqual('<p>text</p>')
    expect(sanitizeContent('<body onload="alert(1)"><p>text</p></body>')).toEqual('<p>text</p>')
  })

  it('drops addresses whose scheme could run or smuggle something', () => {
    expect(sanitizeContent('<a href="javascript:alert(1)">x</a>')).toEqual('<a target="_blank">x</a>')
    expect(sanitizeContent('<a href="JaVaScRiPt:alert(1)">x</a>')).toEqual('<a target="_blank">x</a>')
    expect(sanitizeContent('<a href=" &#106;avascript:alert(1)">x</a>')).toEqual('<a target="_blank">x</a>')
    expect(sanitizeContent('<a href="data:text/html;base64,PHNjcmlwdD4=">x</a>')).toEqual('<a target="_blank">x</a>')
    expect(sanitizeContent('<a href="vbscript:msgbox">x</a>')).toEqual('<a target="_blank">x</a>')
    expect(sanitizeContent('<img src="data:image/svg+xml,%3Csvg%20onload%3Dalert(1)%3E" alt="">')).toEqual('<img alt="">')
    expect(sanitizeContent('<img srcset="javascript:alert(1) 1x" alt="">')).toEqual('<img alt="">')
    expect(sanitizeContent('<video poster="javascript:alert(1)" src="javascript:alert(1)"></video>')).toEqual('<video></video>')
  })

  // Some feeds embed their pictures. An img can only draw a data: image, so
  // that one stays; the same bytes anywhere else, or any other kind, go.
  it('keeps an inline picture on an img and nowhere else', () => {
    const png = 'data:image/png;base64,iVBORw0KGgo='

    expect(sanitizeContent(`<img src="${png}" alt="">`)).toEqual(`<img src="${png}" alt="">`)
    expect(sanitizeContent('<img src="data:image/jpeg;base64,/9j/4AAQ" alt="">')).toContain('src="data:image/jpeg')
    expect(sanitizeContent(`<img srcset="${png} 1x" alt="">`)).toEqual('<img alt="">')
    expect(sanitizeContent(`<a href="${png}">x</a>`)).toEqual('<a target="_blank">x</a>')
    expect(sanitizeContent(`<video poster="${png}"></video>`)).toEqual('<video></video>')
    expect(sanitizeContent(`<object data="${png}"></object>`)).toEqual('')
    expect(sanitizeContent('<img src="data:text/html;base64,PHNjcmlwdD4=" alt="">')).toEqual('<img alt="">')
    expect(sanitizeContent('<img src="data:image/svg+xml;base64,PHN2Zz4=" alt="">')).toEqual('<img alt="">')
  })

  it('keeps the addresses a reader expects', () => {
    expect(sanitizeContent('<a href="https://example.com/a?b=1#c">x</a>')).toContain('href="https://example.com/a?b=1#c"')
    expect(sanitizeContent('<a href="http://example.com/">x</a>')).toContain('href="http://example.com/"')
    expect(sanitizeContent('<a href="mailto:a@example.com">x</a>')).toContain('href="mailto:a@example.com"')
    expect(sanitizeContent('<a href="/relative/path">x</a>')).toContain('href="/relative/path"')
    expect(sanitizeContent('<a href="relative.html">x</a>')).toContain('href="relative.html"')
    expect(sanitizeContent('<a href="#top">x</a>')).toContain('href="#top"')
    expect(sanitizeContent('<a href="//cdn.example.com/x">x</a>')).toContain('href="//cdn.example.com/x"')
    expect(sanitizeContent('<img src="https://example.com/x.png" srcset="https://example.com/x.png 1x, https://example.com/x@2x.png 2x" alt="">')).toContain('srcset="https://example.com/x.png 1x, https://example.com/x@2x.png 2x"')
    expect(sanitizeContent('<video src="https://example.com/x.mp4" poster="https://example.com/x.jpg" controls></video>')).toContain('poster="https://example.com/x.jpg"')
    expect(sanitizeContent('<audio src="https://example.com/x.mp3"></audio>')).toContain('src="https://example.com/x.mp3"')
  })

  it('removes the elements that embed or submit', () => {
    expect(sanitizeContent('<p>a</p><iframe src="https://example.com/"></iframe><object data="x"></object><embed src="x"><p>b</p>')).toEqual('<p>a</p><p>b</p>')
    expect(sanitizeContent('<form action="https://example.com/"><input name="q"><button>Go</button></form><p>b</p>')).toEqual('<p>b</p>')
    expect(sanitizeContent('<link rel="stylesheet" href="https://example.com/x.css"><p>b</p>')).toEqual('<p>b</p>')
  })

  it('removes script wherever the parser hides it', () => {
    expect(sanitizeContent('<svg><script>alert(1)</script><circle r="1"></circle></svg>')).toEqual('<svg><circle r="1"></circle></svg>')
    expect(sanitizeContent('<svg><foreignObject><iframe src="x"></iframe></foreignObject><a href="javascript:alert(1)"><text>x</text></a></svg>')).toEqual('<svg><a target="_blank"><text>x</text></a></svg>')
    // An SVG animation can write an href, so the whole element goes.
    expect(sanitizeContent('<svg><animate onbegin="alert(1)" attributeName="x" dur="1s"></animate><set attributeName="href" to="javascript:alert(1)"></set></svg>')).toEqual('<svg></svg>')
    // maction and annotation-xml are MathML's ways back into HTML; the
    // elements go, maction's words stay.
    expect(sanitizeContent('<math><mi xlink:href="javascript:alert(1)">x</mi><maction href="javascript:alert(1)">y</maction></math>')).toEqual('<math><mi>x</mi>y</math>')
    expect(sanitizeContent('<math><annotation-xml encoding="text/html"><script>alert(1)</script></annotation-xml></math>')).toEqual('<math></math>')
    expect(sanitizeContent('<noscript><p title="</noscript><img src=x onerror=alert(1)>">')).not.toContain('onerror')
  })

  // Markup that is harmless as parsed and dangerous once serialised and parsed
  // again, which is what v-html does with the result. The output has to read
  // the same both times.
  it('reads the same after a second parse', () => {
    const parse = (html) => {
      const div = document.createElement('div')

      div.innerHTML = html

      return div
    }

    const runs = (div) => div.querySelector('script, [onerror], [onload], [href^="javascript"]')

    const vectors = [
      '<svg></p><title><a id="</title><img src=1 onerror=alert(1)>"></svg>',
      '<svg></p><style><a id="</style><img src=1 onerror=alert(1)>"></svg>',
      '<math><mtext><table><mglyph><style><!--</style><img title="--&gt;&lt;img src=1 onerror=alert(1)&gt;">',
      '<form><math><mtext></form><form><mglyph><style></math><img src onerror=alert(1)>',
      '<svg><p><textarea><img src=x onerror=alert(1)></textarea></p></svg>',
      '<math><mtext><table><mglyph><xmp><img src=x onerror=alert(1)>',
      '<select><iframe></select><img src=x onerror=alert(1)>'
    ]

    vectors.forEach((vector) => {
      const once = sanitizeContent(vector)
      const twice = parse(once)

      expect(runs(twice), vector).toBeNull()
      expect(twice.innerHTML, vector).toEqual(once)
    })
  })
})
