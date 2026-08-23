<template>
  <div class="flex gap-2 overflow-x-auto px-4 py-3 border-b border-hairline md:px-6">
    <FilterChip
      v-for="signal in app.queries.signalsForIdentity(identity)"
      :key="`chip-${signal.id}`"
      :selected="app.queries.permalinkForSignal(signal) === current"
      :aria-label="`Visit ${app.queries.titleForSignal(signal)}`"
      class="flex-none"
      @select="$router.push(`/signals/${app.queries.permalinkForSignal(signal)}`)"
    >
      {{ app.queries.titleForSignal(signal) }}
    </FilterChip>
  </div>
</template>

<script>
import FilterChip from '../filter-chip/component.vue'

export default {
  components: { FilterChip },
  props: {
    app: { type: Object, required: true },
    identity: { type: Object, default: null },
    current: { type: String, default: '' }
  }
}
</script>
