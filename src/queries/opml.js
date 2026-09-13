// Every outline with an xmlUrl is a feed, wherever it sits. Folders are the
// outlines around it, and this app has signals rather than folders, so they
// are walked through and forgotten.
const feedsFromOpml = (text) => {
  const doc = new DOMParser().parseFromString(`${text || ''}`, 'text/xml')

  const feeds = Array.from(doc.querySelectorAll('outline[xmlUrl]')).map((outline) => {
    const url = outline.getAttribute('xmlUrl')

    return { url, title: outline.getAttribute('title') || outline.getAttribute('text') || url }
  })

  if (!feeds.length) throw new Error('That does not look like an OPML file.')

  return feeds
}

export default feedsFromOpml
