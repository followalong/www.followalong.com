<template>
  <nav
    :class="on === 'chrome' ? 'flex gap-1' : 'flex items-stretch'"
    aria-label="Primary"
  >
    <NavItem
      v-for="destination in DESTINATIONS"
      :key="destination.to"
      :to="destination.to"
      :label="on === 'chrome' && destination.short ? destination.short : destination.label"
      :icon="destination.icon"
      :active="OWNED_BY[destination.to]($route.path)"
      :on="on"
      :class="on === 'chrome' ? '' : 'flex-1'"
    />
  </nav>
</template>

<script>
import NavItem from '../nav-item/component.vue'
import { DESTINATIONS, OWNED_BY } from './destinations.js'

export default {
  components: { NavItem },
  props: {
    on: {
      type: String,
      default: 'surface',
      validator: (value) => ['chrome', 'surface'].includes(value)
    }
  },
  data: () => ({ DESTINATIONS, OWNED_BY })
}
</script>
