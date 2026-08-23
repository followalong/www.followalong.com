<template>
  <div>
    <div class="flex gap-2 overflow-x-auto px-4 py-3 border-b border-hairline md:px-6">
      <FilterChip
        v-for="category in categories"
        :key="category.key"
        :selected="category.key === selected"
        :aria-label="`Show ${category.label.toLowerCase().replace(/ \(\d+\)$/, '')} add-ons`"
        class="flex-none"
        @select="selected = category.key"
      >
        {{ category.label }}
      </FilterChip>
    </div>

    <p
      v-if="!shown.length"
      class="px-4 py-5 text-body text-ink-secondary md:px-6"
    >
      No add-ons here yet.
    </p>

    <div class="md:px-6 md:py-5 md:grid md:grid-cols-2 md:gap-3.5 md:items-start max-w-app">
      <AddonEditor
        v-for="addon in shown"
        :key="addon.type"
        :app="app"
        :identity="identity"
        :addon="addon"
        :button-text="addon.id ? 'Configure' : 'Install'"
        :submit-text="addon.id ? 'Save &amp; enable' : 'Install'"
      />
    </div>
  </div>
</template>

<script>
import AddonEditor from '../../components/addon-editor/component.vue'
import FilterChip from '../../components/filter-chip/component.vue'

const ALL = 'all'
const INSTALLED = 'installed'

export default {
  components: {
    AddonEditor,
    FilterChip
  },

  props: ['app', 'identity'],

  data () {
    // Installed add-ons and the marketplace are one page; /add-ons is just
    // this page arriving with the Installed filter already on.
    return { selected: this.$route.path === '/add-ons' ? INSTALLED : ALL }
  },

  computed: {
    addons () {
      return this.app.queries.availableAddonAdaptersForIdentity(this.identity)
    },

    installedCount () {
      return this.addons.filter((addon) => addon.id).length
    },

    categories () {
      const labels = this.addons
        .flatMap((addon) => this.app.queries.labelsForAddon(addon))
        .filter((label, index, all) => all.indexOf(label) === index)

      return [
        { key: ALL, label: 'All' },
        { key: INSTALLED, label: `Installed (${this.installedCount})` },
        ...labels.map((label) => ({ key: label, label }))
      ]
    },

    shown () {
      if (this.selected === ALL) return this.addons
      if (this.selected === INSTALLED) return this.addons.filter((addon) => addon.id)

      return this.addons.filter((addon) => {
        return this.app.queries.labelsForAddon(addon).includes(this.selected)
      })
    }
  }
}
</script>
