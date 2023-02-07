<template>
  <div>
    <PageTitle title="Add-ons">
      <template #description>
        <p>Supercharge your experience</p>
      </template>
    </PageTitle>

    <AddonEditor
      v-for="addon in app.queries.addonAdaptersForIdentity(identity)"
      :key="addon.id"
      :app="app"
      :identity="identity"
      :addon="addon"
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

  props: ['app', 'identity']
}
</script>
