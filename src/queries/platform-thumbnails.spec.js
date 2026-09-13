import { describe, test, expect } from 'vitest'
import Queries from './index.js'

// One item from each video platform, as its feed really writes it, parsed the
// way Commands#fetchUrl parses a response. Pins that the card poster resolves.
const queries = new Queries({})

const firstEntry = (xml) => {
  const data = queries.jsonFromXml(xml)

  return { data: (data.entry || data.item)[0] }
}

describe('imageForEntry on video platforms', () => {
  test('YouTube names the thumbnail in media:group', () => {
    expect(queries.imageForEntry(firstEntry(`<?xml version="1.0" encoding="UTF-8"?>
      <feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
        <title>Linus Tech Tips</title>
        <entry>
          <id>yt:video:pvSdeU13hKc</id>
          <link rel="alternate" href="https://www.youtube.com/watch?v=pvSdeU13hKc"/>
          <media:group>
            <media:content url="https://www.youtube.com/v/pvSdeU13hKc?version=3" type="application/x-shockwave-flash" width="640" height="390"/>
            <media:thumbnail url="https://i1.ytimg.com/vi/pvSdeU13hKc/hqdefault.jpg" width="480" height="360"/>
          </media:group>
        </entry>
      </feed>`))).toEqual('https://i1.ytimg.com/vi/pvSdeU13hKc/hqdefault.jpg')
  })

  // BitChute's enclosure is the cover image, typed "None".
  test('BitChute puts the cover in an untyped enclosure', () => {
    expect(queries.imageForEntry(firstEntry(`<?xml version="1.0" encoding="UTF-8"?>
      <rss xmlns:atom="http://www.w3.org/2005/Atom" version="2.0">
        <channel>
          <title>Fein Points</title>
          <item>
            <link>https://api.bitchute.com/embed/wtipYJAHbKHu/</link>
            <guid>wtipYJAHbKHu</guid>
            <enclosure length="None" type="None" url="https://static-3.bitchute.com/live/cover_images/1VBwRfyNcKdX/wtipYJAHbKHu_640x360.jpg"></enclosure>
          </item>
        </channel>
      </rss>`))).toEqual('https://static-3.bitchute.com/live/cover_images/1VBwRfyNcKdX/wtipYJAHbKHu_640x360.jpg')
  })

  // Rumble publishes no feed. Generators (rumblerss, openrss) scrape the
  // channel page into a podcast-shaped RSS, where the thumbnail is itunes:image.
  test('a generated Rumble feed names the thumbnail in itunes:image', () => {
    expect(queries.imageForEntry(firstEntry(`<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
        <channel>
          <title>Bongino</title>
          <item>
            <guid>https://rumble.com/v6abc-episode.html</guid>
            <link>https://rumble.com/v6abc-episode.html</link>
            <itunes:image href="https://1a-1791.com/video/fww1/8f/s8/1/x/y/z/xyz.oq1b.jpg"></itunes:image>
          </item>
        </channel>
      </rss>`))).toEqual('https://1a-1791.com/video/fww1/8f/s8/1/x/y/z/xyz.oq1b.jpg')
  })
})
