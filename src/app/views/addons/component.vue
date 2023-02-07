<template>
  <div>
    <PageTitle title="Add-ons">
      <template #description>
        <p>Customize your add-ons</p>
      </template>
      <template #meta>
        <div class="flex">
          <router-link
            to="/marketplace"
            class="rounded-md border border-transparent bg-indigo-100 px-4 py-2 font-medium text-indigo-700 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:text-sm ml-1"
            aria-label="Go to marketplace"
          >
            Find more add-ons
          </router-link>
        </div>
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
