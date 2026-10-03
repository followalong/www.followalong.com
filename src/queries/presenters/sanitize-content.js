// Feed HTML is drawn inside the app's own origin, where the bucket keys and
// the hosted token live, so nothing in it may run. What leaves: script in any
// form, anything that embeds or submits, and any address whose scheme is not
// one a reader follows. Pictures, media and links stay.

// script and style run or restyle; meta and base send the page elsewhere
// without a click; the rest embed another document, take input, or load a
// resource the page then obeys. noscript and template hide markup from the
// walk below until a browser re-parses it.
const REMOVED = 'script, style, meta, base, iframe, object, embed, form, input, button, textarea, select, link, foreignObject, noscript, template'

// Attributes that name an address. Only these may hold one at all.
const ADDRESSES = ['href', 'xlink:href', 'src', 'srcset', 'action', 'formaction', 'poster', 'data', 'cite', 'background']

// Browsers ignore whitespace and control characters inside a scheme, so
// "java\tscript:" runs. They are stripped before the scheme is read.
// eslint-disable-next-line no-control-regex
const NOISE = /[\s\u0000-\u001f\u007f-\u009f]/g

const SCHEME = /^([a-z][a-z0-9+.-]*):/i

const FOLLOWED = ['http', 'https', 'mailto']

// A plain address, or none at all: a relative path, a fragment, or
// a protocol-relative one. srcset holds several, each ending in a space.
const followed = (value) => `${value}`.split(',').every((candidate) => {
  const scheme = candidate.replace(NOISE, '').match(SCHEME)

  return !scheme || FOLLOWED.includes(scheme[1].toLowerCase())
})

// A scheme that runs, wherever it turns up: an SVG animation's `to` or
// `values` can write an href.
const RUNS = /^(javascript|vbscript|data|livescript|mocha):/i

// An inline picture, which some feeds embed. The one data: address kept, and
// only on an img's src, where a browser can do nothing but draw it. Not svg,
// which is a document.
const INLINE_IMAGE = /^data:image\/(?!svg)[a-z0-9.+-]+[;,]/i

const presentational = ['style', 'width', 'height', 'class']

const unsafe = (tag) => ({ name, value }) => {
  if (/^on/i.test(name) || presentational.includes(name)) return true

  if (tag === 'img' && name === 'src' && INLINE_IMAGE.test(value.replace(NOISE, ''))) return false

  return ADDRESSES.includes(name.toLowerCase()) ? !followed(value) : RUNS.test(value.replace(NOISE, ''))
}

export default (s) => {
  const div = document.createElement('div')

  div.innerHTML = s

  div.querySelectorAll(REMOVED).forEach(($el) => $el.remove())

  div.querySelectorAll('*').forEach(($el) => {
    Array.from($el.attributes).filter(unsafe($el.localName)).forEach(({ name }) => $el.removeAttribute(name))
  })

  // Whatever leaves, leaves the app: the native shell has one webview.
  div.querySelectorAll('a, area').forEach(($el) => $el.setAttribute('target', '_blank'))

  return div.innerHTML
}
