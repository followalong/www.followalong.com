<template>
  <div>
    <PageTitle title="Marketplace">
      <template #description>
        <p>Find customizable add-ons to supercharge your experience</p>
      </template>
    </PageTitle>

    <AddonEditor
      v-for="addon in addons"
      :key="addon.id"
      :app="app"
      :identity="identity"
      :addon="addon"
      button-text="Install"
      submit-text="Install"
    />
  </div>
</template>

<script>
import AddonEditor from '../../components/addon-editor/component.vue'
import PageCard from '../../components/page-card/component.vue'
import PageTitle from '../../components/page-title/component.vue'

export default {
  components: {
    AddonEditor,
    PageCard,
    PageTitle
  },

  props: ['app', 'identity'],

  computed: {
    addons () {
      return this.app.queries.availableAddonAdaptersForIdentity(this.identity)
    }
  }
}
</script>
