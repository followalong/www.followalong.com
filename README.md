# FollowAlong

## Why Am I still using YouTube / FB / News Sites?

- Play songs (looking for specific content)
- Discover (looking for new content)
- Interact in a group (comment / like / share)

## Releasing

A version tag releases the app. Do these steps:

1. Set the new version in `package.json`, `desktop/src-tauri/gen/apple/project.yml` (twice) and `desktop/src-tauri/gen/apple/follow-along_iOS/Info.plist` (twice).
2. Commit the change to `main` and push it.
3. Tag the commit and push the tag: `git tag -m v1.2.3 v1.2.3 && git push origin v1.2.3`.

The tag starts `.github/workflows/release.yml`. The specs run first. When they pass, two jobs start:

- **testflight** builds the iOS app and sends it to TestFlight.
- **macos** builds the Mac app for Apple Silicon. It signs the app with the Developer ID certificate, notarizes it and staples the ticket. Then it creates the GitHub release of the tag with `Follow-Along_<version>_aarch64.dmg`.

The steps live in the shared [dallasread/releases](https://github.com/dallasread/releases) workflows. Follow Along, 66 Scripts and Reviewer use the same ones. A fix there reaches all three apps. A re-run of a failed job uses the old copy of the shared workflow, so push the tag again to get a fix.

## TODO

- Memberships
- Ads

## Addons

- RSS Proxy: A way to bypass CORS restrictions
- Search: A way to find things
- Sync: A way to backup account data and sync to other devices
- Discovery: A way to discover new things
- Media: A way to backup saved media files that may disappear over time
- Publishing: A way to publish content

## Ads

The power of curation must be in the hands of the Feed. If things go bad, they can just change providers. They can also just supply their own.

An "Ad Provider" is in charge of showing ads.

An "Ad Provider" could be the feed itself OR outsourced – its just a link.

The publisher can define at the `Item` level:

```xml
<Item>
  <Ad format="skyscraper" src="https://example.com/my-feed/ad.jpg" href="httsp://example.com">
</Item>
```

Another, more complicated option would be to add it at the `Feed` level:

```xml
<Feed>
  <AdProvider url="https://example.com/my-feed">
</Feed>
```

## RSS Sources

From: <https://12bytes.org/articles/tech/how-to-access-rss-feeds/>

- Odysee: `https://lbryfeed.melroy.org/channel/<channel_name>`
- Bitchute: `https://www.bitchute.com/feeds/rss/channel/<channel_name>`
- YouTube: `https://www.youtube.com/feeds/videos.xml?channel_id=<channel_id>`
- Vimeo: `https://vimeo.com/<channel_name>/videos/rss`
- Steemit: `http://www.hiverss.com/@<channel_name>/feed`
- Tumblr: `https://example.tumblr.com/rss`
- Generic: /feed
- Generic: /rss
- Generic: /atom
- Generic: /feed/atom
- Generic: /?feed=rss
- Generic: /?feed=atom
