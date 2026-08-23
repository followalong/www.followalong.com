<template>
  <div>
    <div class="flex gap-2 overflow-x-auto px-4 py-3 border-b border-hairline md:px-6">
      <FilterChip
        v-for="category in categories"
        :key="category"
        :selected="category === selected"
        class="flex-none"
        @select="selected = category"
      >
        {{ category }}
      </FilterChip>
    </div>

    <div class="md:px-6 md:py-5 md:grid md:grid-cols-2 md:gap-3.5 md:items-start max-w-app">
      <AddonEditor
        v-for="addon in shown"
        :key="addon.id || addon.type"
        :app="app"
        :identity="identity"
        :addon="addon"
        :button-text="addon.id ? 'Configure' : 'Install'"
        :submit-text="addon.id ? 'Save & enable' : 'Install'"
      />
    </div>
  </div>
</template>

<script>
import AddonEditor from '../../components/addon-editor/component.vue'
import FilterChip from '../../components/filter-chip/component.vue'

export default {
  components: {
    AddonEditor,
    FilterChip
  },

  props: ['app', 'identity'],

  data: () => ({ selected: 'All' }),

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

      return ['All', `Installed (${this.installedCount})`, ...labels]
    },

    shown () {
      if (this.selected === 'All') return this.addons

      if (this.selected.startsWith('Installed')) {
        return this.addons.filter((addon) => addon.id)
      }

      return this.addons.filter((addon) => {
        return this.app.queries.labelsForAddon(addon).includes(this.selected)
      })
    }
  }
}
</script>
