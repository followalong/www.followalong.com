<template>
  <div>
    <PageTitle title="Marketplace">
      <template #description>
        <p>Find customizable add-ons to supercharge your experience</p>
      </template>
    </PageTitle>

    <PageCard
      v-for="addon in addons"
      :key="`addon-${addon.name}`"
    >
      <template #title>
        <p class="font-medium text-gray-900">
          {{ addon.title }}
        </p>
      </template>
      <template #meta>
        <router-link
          to="/marketplace"
          class="rounded-md border border-transparent bg-indigo-100 -m-2 px-4 py-2 font-medium text-indigo-700 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:text-sm ml-1"
          aria-label="Go to marketplace"
        >
          Install
        </router-link>
      </template>
      <template
        #content
      >
        <div
          class="prose"
          v-html="app.queries.sanitizeCopy(addon.description)"
        />
      </template>
    </PageCard>
  </div>
</template>

<script>
import PageCard from '../../components/page-card/component.vue'
import PageTitle from '../../components/page-title/component.vue'
import CORSAnywhere from '../../../adapters/addons/cors-anywhere.js'

export default {
  components: {
    PageCard,
    PageTitle
  },

  props: ['app', 'identity'],

  data () {
    return {
      addons: [
        CORSAnywhere,
        CORSAnywhere,
        CORSAnywhere,
        CORSAnywhere,
        CORSAnywhere
      ].map((A) => new A({}, {}))
    }
  }
}
</script>
