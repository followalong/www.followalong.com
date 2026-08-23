<template>
  <div class="p-4 md:p-6 flex flex-col gap-4 md:gap-[18px] max-w-[560px]">
    <p class="text-meta text-ink-muted">
      Your identity lives only on this device
    </p>

    <div class="bg-white border border-hairline-strong rounded-xl overflow-hidden">
      <ListRow
        title="Add-ons"
        :meta="`${addonCount} installed`"
        to="/add-ons"
        aria-label="Add-ons"
      />
      <ListRow
        title="Roll up this identity"
        meta="clean up"
        action
        aria-label="Roll up identity"
        @click="rollUpIdentity"
      />
    </div>

    <div class="bg-white border border-hairline-strong rounded-xl overflow-hidden">
      <ListRow
        title="Help"
        meta="followalong@protonmail.com"
        to="/help"
        aria-label="Help"
      />
      <ListRow
        title="Changelog"
        meta="a feed you follow"
        :to="CHANGELOG_PATH"
        aria-label="Visit Changelog"
      />
    </div>

    <button
      type="button"
      aria-label="Forget identity"
      class="bg-danger-bg border border-danger-border rounded-xl px-4 py-3.5 flex items-center justify-between gap-3 text-left"
      @click="forgetIdentity"
    >
      <span>
        <span class="block text-[14px] font-bold text-danger">Forget this identity</span>
        <span class="block text-meta text-ink-secondary mt-0.5">Removes all traces on this device</span>
      </span>
      <span class="text-meta font-semibold text-danger flex-none">Forget me</span>
    </button>
  </div>
</template>

<script>
import ListRow from '../../components/list-row/component.vue'

const CHANGELOG_PATH = '/https://changelog.followalong.com/feed.xml'

export default {
  components: {
    ListRow
  },

  props: ['app', 'identity'],

  data: () => ({ CHANGELOG_PATH }),

  computed: {
    addonCount () {
      return this.app.queries.addonsForIdentity(this.identity).length
    }
  },

  methods: {
    forgetIdentity () {
      this.app.confirm('Are you sure you want to remove this identity?')
        .then(() => this.app.commands.forgetIdentity(this.identity))
        .then(() => this.app.setIdentity(this.app.queries.allIdentities()[0]))
        .then(() => this.$router.push('/'))
        .catch(() => {})
    },

    rollUpIdentity () {
      this.app.confirm('Are you sure you want to roll up this identity?')
        .then(() => this.app.commands.createProjectionForIdentity(this.identity))
        .then(() => this.$router.push('/'))
        .catch(() => {})
    }
  }
}
</script>
