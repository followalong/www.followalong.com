<template>
  <div>
    <PageTitle title="Installed Add-ons">
      <template #description>
        <p>Customize your installed add-ons</p>
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

    <PageCard v-if="!addons.length">
      <template #title>
        <p class="font-medium text-gray-900">
          No add-ons installed
        </p>
      </template>
      <template
        #content
      >
        <div class="prose">
          <p>
            You haven't installed any add-ons yet.<br><br>
            Don't fret &mdash; add-ons are easy to install over in the
            <router-link
              to="/marketplace"
              class="inline-block"
            >
              marketplace
            </router-link>.
          </p>
        </div>
      </template>
    </PageCard>

    <AddonEditor
      v-for="addon in addons"
      :key="addon.id"
      :app="app"
      :identity="identity"
      :addon="addon"
      button-text="Configure"
      submit-text="Save configuration"
    />
  </div>
</template>

<script>
import AddonEditor from '../../components/addon-editor/component.vue'
import PageTitle from '../../components/page-title/component.vue'
import PageCard from '../../components/page-card/component.vue'

export default {
  components: {
    AddonEditor,
    PageCard,
    PageTitle
  },

  props: ['app', 'identity'],

  computed: {
    addons () {
      return this.app.queries.addonAdaptersForIdentity(this.identity)
    }
  }
}
</script>
