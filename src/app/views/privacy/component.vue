<template>
  <PageBody>
    <ArticleCard :parts="PARTS" />

    <p class="px-4 text-meta text-ink-muted">
      Last changed {{ CHANGED }}.
      <router-link
        to="/terms"
        aria-label="Terms"
        class="text-primary font-semibold"
      >
        Terms
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
    title: 'What stays on your device',
    body: [
      'Everything, unless you set up a backup: the feeds you follow, each entry, which ones you have read, which ones you saved, and your settings. It lives in this browser or app.'
    ]
  },
  {
    title: 'What the service stores when you sign in',
    body: [
      'Your email address, and a copy of your log: feeds, read marks, saved entries and settings.',
      'That copy is readable by the service. It is read to sync your devices and for nothing else. Nobody looks at it by hand unless you ask us to.'
    ]
  },
  {
    title: 'Your own storage',
    body: [
      'If you connect a bucket of your own instead, the copy goes to your bucket and never to us.',
      'When you set a backup password, the copy is encrypted on this device before it leaves. Without a password it goes up readable, and the You page says so.'
    ]
  },
  {
    title: 'Fetching feeds',
    body: [
      'Most sites do not let a browser fetch a feed directly, so by default the app fetches feeds through our proxy. The proxy sees the address of each feed it fetches. It does not use that to identify you or build a profile.',
      'You can switch to a proxy of your own under Add-ons on the You page.',
      'Pictures, audio and video in an entry load from the site that published them. That site sees the request, as it would in any browser.'
    ]
  },
  {
    title: 'What we do not do',
    body: [
      'No tracking. No analytics. No ads. No third-party scripts.',
      'We do not sell your data and we do not share it.'
    ]
  },
  {
    title: 'Payments',
    body: [
      'Apple or Stripe handles payment. We never see your card. They tell us only whether your subscription is paid.'
    ]
  },
  {
    title: 'Deleting your data',
    body: [
      'Delete account on the You page deletes the copy the service holds and your email address.',
      'Forget this identity on the You page removes everything on this device.'
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
