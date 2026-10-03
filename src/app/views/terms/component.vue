<template>
  <PageBody>
    <ArticleCard :parts="PARTS" />

    <p class="px-4 text-meta text-ink-muted">
      Last changed {{ CHANGED }}.
      <router-link
        to="/privacy"
        aria-label="Privacy"
        class="text-primary font-semibold"
      >
        Privacy
      </router-link>
    </p>
  </PageBody>
</template>

<script>
import PageBody from '../../components/page-body/component.vue'
import ArticleCard from '../../components/article-card/component.vue'

const CHANGED = 'October 2, 2026'

// A first draft for a one-person product. Plain words, one idea a sentence.
const PARTS = [
  {
    title: 'What Follow Along is',
    body: [
      'Follow Along is a feed reader. It runs on your device and keeps what you follow there.',
      'A subscription adds an account. The account keeps a copy of your feeds, so every device you sign in on shows the same thing.'
    ]
  },
  {
    title: 'Your account',
    body: [
      'You sign in with an email address and a code we send to it. Keep that address yours. Anyone who can read it can sign in as you.',
      'One account is for one person. You are responsible for what is done with it.'
    ]
  },
  {
    title: 'The subscription',
    body: [
      'The subscription renews on its own, each month or each year, until you cancel it. The price is shown before you buy.',
      'You can cancel at any time. If you bought it in the iOS app, cancel it in your Apple Account settings. If you bought it on the web, cancel it from Manage subscription on the You page.',
      'Cancelling stops the next renewal. The current period runs to its end.',
      'Apple handles refunds for purchases made through the App Store, under its own rules. For a purchase made on the web, email us.'
    ]
  },
  {
    title: 'When a subscription ends',
    body: [
      'Syncing stops. Your feeds stay on each device you used, and the app keeps working there.',
      'The copy the service holds is deleted when you delete your account from the You page.'
    ]
  },
  {
    title: 'The feeds you follow',
    body: [
      'The feeds you follow are published by other people. Follow Along fetches them for you and changes nothing. They stay theirs.'
    ]
  },
  {
    title: 'The service',
    body: [
      'Follow Along is made by one person and provided as it is. We work to keep it running and your copy safe, and we cannot promise it will never fail.',
      'We may change the service. If we ever stop it, we will tell you by email first, so you can copy your feeds out.'
    ]
  },
  {
    title: 'Changes to these terms',
    body: [
      'When these terms change, the date at the end of this page changes with them.'
    ]
  },
  {
    title: 'Contact',
    body: [
      'Email followalong@protonmail.com.'
    ]
  }
]

export default {
  components: { PageBody, ArticleCard },
  props: ['app', 'identity'],
  data: () => ({ PARTS, CHANGED })
}
</script>
