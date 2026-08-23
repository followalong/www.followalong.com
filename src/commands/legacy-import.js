import VERSION from '../state/version.js'

// Merges a "Download Identity" file from the old followalong.net app. That
// export carries every feed and only the saved items, which is what there is
// left to recover.
//
// Merge, not restore: a feed already here is reused rather than duplicated, an
// entry already here is matched rather than remade, and only missing state is
// added. Running it twice changes nothing the second time.

// Event keys parse the object id as [\w-:]+, so anything else has to go.
const safeId = (id) => String(id).replace(/[^\w:-]/g, '-')

const num = (value) => {
  const n = typeof value === 'string' ? Date.parse(value) : Number(value)

  return Number.isFinite(n) ? Math.floor(n) : 0
}

const textOf = (value) => {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') return value['#text'] || value['@_href'] || value.href || value.url

  return null
}

// An RSS <guid> carrying attributes parses to an object, so keyForEntry skips
// it and settles on the link. Matching on the single key it happens to choose
// misses entries the old app knew by their guid, so index them all.
const identifiersForEntry = (entry) => {
  const data = (entry && entry.data) || {}

  return [data.id, textOf(data.guid), textOf(data.link), textOf(data.url)]
    .filter((key) => typeof key === 'string' && key.length)
}

const identifiersForItem = (item) => {
  return [item.guid, item.link, item.id && `imported:${item.id}`]
    .filter((key) => typeof key === 'string' && key.length)
}

const entryDataFor = (item) => {
  const data = {
    // Mirrors what keyForEntry reads, with a fallback so it can never throw.
    id: item.guid || item.link || `imported:${item.id}`,
    guid: item.guid,
    title: item.title,
    pubDate: item.pubDate,
    description: item.content,
    link: item.link,
    author: item.author
  }

  if (item.enclosure) data.enclosure = item.enclosure
  if (item['media:player']) data['media:player'] = item['media:player']
  if (item.itunes) data.itunes = item.itunes
  else if (item.image && item.image.url) data.itunes = { image: item.image.url }

  return data
}

const isLegacyIdentity = (data) => {
  return !!data && Array.isArray(data.feeds) && Array.isArray(data.items)
}

export { safeId, num, identifiersForEntry, identifiersForItem, entryDataFor, isLegacyIdentity, VERSION }
