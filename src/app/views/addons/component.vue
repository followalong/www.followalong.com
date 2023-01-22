<template>
  <div>
    <PageTitle title="Add-ons">
      <template #description>
        <p>Supercharge your experience</p>
      </template>
    </PageTitle>

    <AddonEditor
      :app="app"
      :identity="identity"
      :addon="rssAddon"
    />
  </div>
</template>

<script>
import AddonEditor from '../../components/addon-editor/component.vue'
import PageTitle from '../../components/page-title/component.vue'

export default {
  components: {
    AddonEditor,
    PageTitle
  },

  props: ['app', 'identity'],

  data () {
    return {
      rssAddon: this.app.queries.findAddon('rss')
    }
  }
}
</script>
