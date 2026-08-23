<template>
  <div class="md:px-6 md:py-5 max-w-river md:mx-auto">
    <div
      v-if="!addons.length"
      class="p-4 md:p-0 flex flex-col items-start gap-3"
    >
      <p class="text-body text-ink-secondary">
        You haven't installed any add-ons yet. They are easy to install over in
        the marketplace.
      </p>
      <router-link
        to="/marketplace"
        aria-label="Go to marketplace"
        class="rounded-lg bg-primary px-4 py-2.5 text-body font-semibold text-white"
      >
        Find add-ons
      </router-link>
    </div>

    <div
      v-else
      class="flex flex-col gap-0 md:gap-3.5"
    >
      <AddonEditor
        v-for="addon in addons"
        :key="addon.id"
        :app="app"
        :identity="identity"
        :addon="addon"
        button-text="Configure"
        submit-text="Save &amp; enable"
      />

      <router-link
        to="/marketplace"
        aria-label="Go to marketplace"
        class="self-start m-4 md:m-0 rounded-lg border border-hairline-outline px-4 py-2.5 text-body font-semibold text-ink-body"
      >
        Find more add-ons
      </router-link>
    </div>
  </div>
</template>

<script>
import AddonEditor from '../../components/addon-editor/component.vue'

export default {
  components: {
    AddonEditor
  },

  props: ['app', 'identity'],

  computed: {
    addons () {
      return this.app.queries.addonAdaptersForIdentity(this.identity)
    }
  }
}
</script>
