// Two sentences of plain text for a card, taken without building a DOM.
//
// The reader's copy of an entry goes through sanitize-content, which parses
// the body into a detached tree, walks every element and serialises it back.
// A card wants two hundred characters, and a feed page used to pay for that
// parse once per entry before anyone had read a word: measured against a real
// identity, 645 entries cost 685ms of a 1,350ms mount, over half the time the
// cards took to render.
//
// Nothing here is a sanitiser. The output is rendered as text, never as
// markup, so the job is only to read like the entry's opening line.
const MAX = 200

// Tags whose text is not the entry's words. Stripping the tags alone and
// leaving what is between them puts a stylesheet or an analytics snippet
// where the first sentence should be.
const NOT_WORDS = /<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi

// Only the five XML entities plus numeric escapes. A feed writes these; a full
// HTML entity table is what the DOM was doing for us and is not worth carrying
// to render a preview.
const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' '
}

const decode = (text) => {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, body) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X'
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10)

      return Number.isFinite(code) ? String.fromCodePoint(code) : whole
    }

    const named = ENTITIES[body.toLowerCase()]

    return typeof named === 'undefined' ? whole : named
  })
}

const plainText = (html) => {
  return decode(`${html}`.replace(NOT_WORDS, ' ').replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

export default (html) => {
  if (!html) return ''

  const text = plainText(html)
  const sentences = text.match(/[^.!?]+[.!?]+/g)
  // Each match carries the space that followed the previous full stop, so
  // they are trimmed before joining rather than run together with a second.
  const taken = sentences
    ? sentences.slice(0, 2).map((one) => one.trim()).join(' ')
    : text

  if (taken.length <= MAX) return taken

  return `${taken.slice(0, MAX).replace(/\s+\S*$/, '')}…`
}

export { plainText }
