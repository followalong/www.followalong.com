// Feed HTML is drawn inside the app's own origin, where the bucket keys and
// the hosted token live, so nothing in it may run. DOMPurify decides what
// stays; the config below says what this app adds to its defaults.
import DOMPurify from 'dompurify'

// Browsers ignore whitespace and control characters inside a scheme, so
// "java\tscript:" runs. They are stripped before the scheme is read.
// eslint-disable-next-line no-control-regex
const NOISE = /[\s\u0000-\u001f\u007f-\u009f]/g

// An inline picture, which some feeds embed. The one data: address kept, and
// only on an img's src, where a browser can do nothing but draw it. Not svg,
// which is a document.
const INLINE_IMAGE = /^data:image\/(?!svg)[a-z0-9.+-]+[;,]/i

const purifier = DOMPurify()

// Removed with their words: a control's text is its label or its options, not
// prose. A form's words stay, since a form can wrap an article.
const CONTROLS = ['button', 'textarea', 'select']

purifier.setConfig({
  // DOMPurify keeps forms and styles; a feed has nothing to submit or restyle.
  FORBID_TAGS: ['form', 'input', 'style', ...CONTROLS],
  // Presentation is the app's, not the feed's.
  FORBID_ATTR: ['style', 'width', 'height', 'class']
})

purifier.addHook('uponSanitizeElement', (node, data) => {
  if (CONTROLS.includes(data.tagName)) node.textContent = ''
})

// DOMPurify lets any data: through on an img, audio or video src. Only a
// picture is wanted, and only where it can be drawn.
purifier.addHook('uponSanitizeAttribute', (node, data) => {
  const value = data.attrValue.replace(NOISE, '')

  if (!/^data:/i.test(value)) return

  data.keepAttr = node.localName === 'img' && data.attrName === 'src' && INLINE_IMAGE.test(value)
})

// Whatever leaves, leaves the app: the native shell has one webview.
purifier.addHook('afterSanitizeAttributes', (node) => {
  if (node.localName === 'a' || node.localName === 'area') node.setAttribute('target', '_blank')
})

export default (s) => purifier.sanitize(s)
