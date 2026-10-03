<template>
  <PageBody>
    <ArticleCard :parts="PARTS" />

    <Card>
      <h2 class="text-card font-bold text-ink">
        Ask us
      </h2>
      <p class="text-body text-ink-secondary mt-2">
        Email
        <a
          href="mailto:followalong@protonmail.com"
          target="_blank"
          class="text-primary font-semibold"
        >followalong@protonmail.com</a>.
        One person reads it, and answers.
      </p>
    </Card>

    <Card :padded="false">
      <ListRow
        title="Terms"
        meta="the subscription, and what you agree to"
        to="/terms"
        aria-label="Terms"
      />
      <ListRow
        title="Privacy"
        meta="what is stored, where, and what is not"
        to="/privacy"
        aria-label="Privacy"
      />
    </Card>
  </PageBody>
</template>

<script>
import PageBody from '../../components/page-body/component.vue'
import Card from '../../components/card/component.vue'
import ListRow from '../../components/list-row/component.vue'
import ArticleCard from '../../components/article-card/component.vue'

// The questions a new reader has, answered before they have to ask.
const PARTS = [
  {
    title: 'How to follow something',
    body: [
      'Open search from the top bar and paste a feed link. The feed opens, and Follow adds it.',
      'A feed link is not the site\'s address. It often ends in /feed, /rss or .xml, and most sites link to it in the footer or under an RSS icon.',
      'YouTube: a channel\'s feed is youtube.com/feeds/videos.xml?channel_id= followed by the channel ID. Podcasts: the show\'s page usually offers an RSS link.'
    ]
  },
  {
    title: 'Reading and keeping',
    body: [
      'Tap a title to read the entry here. Done marks it read and takes it off Home. The bookmark keeps it under Saved.',
      'A feed\'s own page has a menu in the top bar: fetch it now, catch up on everything unread, pause it, or unfollow it.'
    ]
  },
  {
    title: 'Keeping it on every device',
    body: [
      'Sign in on the You page. The same email on another device shows the same feeds. Or connect storage of your own under Your own storage.'
    ]
  }
]

export default {
  components: { PageBody, Card, ListRow, ArticleCard },
  props: ['app', 'identity'],
  data: () => ({ PARTS })
}
</script>
