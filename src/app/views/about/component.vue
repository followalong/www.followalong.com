<template>
  <div class="p-4 md:px-6 md:py-5 flex flex-col gap-4 max-w-river md:mx-auto">
    <section
      v-for="part in PARTS"
      :key="part.title"
      class="bg-white border border-hairline-strong rounded-xl p-4 md:p-5"
    >
      <h2 class="text-card md:text-card-lg font-bold text-ink">
        {{ part.title }}
      </h2>
      <p
        v-for="(paragraph, index) in part.body"
        :key="index"
        class="text-body md:text-sm text-ink-secondary mt-2 leading-relaxed"
      >
        {{ paragraph }}
      </p>
    </section>

    <p class="text-meta text-ink-muted">
      Follow Along is open source.
      <a
        href="https://github.com/followalong/www.followalong.com"
        target="_blank"
        class="text-primary font-semibold"
      >Read the code</a>.
    </p>
  </div>
</template>

<script>
const PARTS = [
  {
    title: 'What is Follow Along?',
    body: [
      'A place to follow the people and communities you care about, built on RSS. It knows how to fetch new content from the things you follow, and it keeps all of it here, in this browser.',
      'RSS means you can follow YouTube channels, blogs, calendars, podcasts, team activity, and much more — most of the internet already publishes it.'
    ]
  },
  {
    title: 'What makes it different',
    body: [
      'Until now, social networks stored everyone’s data in one central place. What you like, who you follow, who you donate to — all of it sits on a server out of your hands, and the company that owns it decides what you see.',
      'Follow Along decentralizes that. Once you choose which feeds to follow, your own device is the server, the storage, and the connection. Content comes straight from the source, with no ranking, no ads, and no trackers.'
    ]
  },
  {
    title: 'How others can follow you',
    body: [
      'Exactly as with email, you can pick a hosting provider or run your own feed — you may already have one on your website. Anyone can follow any RSS feed, whether it comes from WordPress, YouTube, a podcast host, an intranet, or a calendar.',
      'Publishing from your own site is the version least likely to be restricted by anyone else.'
    ]
  },
  {
    title: 'The tech specs',
    body: [
      'Follow Along is a fully client-side progressive web app that fetches RSS feeds for you. Nothing about you or the feeds you follow is tracked.',
      'Add-ons extend it: a proxy for feeds that block cross-origin requests, an S3 bucket to sync your own encrypted log between devices, and more.'
    ]
  }
]

export default {
  props: ['app', 'identity'],
  data: () => ({ PARTS })
}
</script>
