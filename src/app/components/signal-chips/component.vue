<template>
  <div class="flex gap-2 items-center px-4 py-3 border-b border-hairline md:px-6">
    <!-- The chips scroll; anything in #end stays put, because the action there
         is the one you reach for when the list feels long. -->
    <div class="flex gap-2 flex-1 min-w-0 overflow-x-auto">
      <FilterChip
        v-for="signal in app.queries.signalsForIdentity(identity)"
        :key="`chip-${signal.id}`"
        :selected="app.queries.permalinkForSignal(signal) === current"
        :aria-label="`Visit ${app.queries.titleForSignal(signal)}`"
        class="flex-none"
        @select="$router.push(`/signals/${app.queries.permalinkForSignal(signal)}`)"
      >
        {{ app.queries.titleForSignal(signal) }}
        <span
          v-if="unreadFor(signal)"
          data-chip-count
          class="ml-1 font-bold"
        >{{ unreadFor(signal) }}</span>
      </FilterChip>
    </div>

    <slot name="end" />
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
  },
  methods: {
    unreadFor (signal) {
      if (!this.identity) return 0

      return this.app.queries.unreadEntriesForSignalLength(this.identity, signal)
    }
  }
}
</script>
