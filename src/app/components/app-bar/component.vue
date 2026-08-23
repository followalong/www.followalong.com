<template>
  <header class="bg-chrome sticky top-0 z-40">
    <div class="max-w-app px-4 py-3 md:px-6 md:py-2.5 flex items-center gap-3 md:gap-4">
      <div
        data-bar-slot
        class="h-slot w-slot flex-none"
      >
        <router-link
          v-if="back"
          data-bar-back
          :to="back"
          aria-label="Back"
          class="h-slot w-slot rounded-full bg-white/10 flex items-center justify-center text-chrome-icon text-base font-bold"
        >
          ←
        </router-link>
        <router-link
          v-else
          data-bar-logo
          to="/"
          aria-label="Follow Along home"
          class="block h-slot w-slot"
        >
          <img
            :src="logoIcon"
            class="h-slot w-slot"
            alt="Follow Along"
          >
        </router-link>
      </div>

      <h1
        aria-label="Page title"
        class="text-title font-extrabold text-white flex-1 min-w-0 truncate"
      >
        <router-link
          to="/"
          class="block truncate"
        >
          {{ title }}
        </router-link>
      </h1>

      <slot name="nav" />

      <div
        data-bar-slot
        class="h-slot w-slot flex-none flex items-center justify-end"
      >
        <slot name="action" />
      </div>
    </div>
  </header>
</template>

<script>
import logoIcon from '../../../assets/imgs/logo-house.svg'

export default {
  props: {
    title: { type: String, required: true },
    // A sub-page swaps the logo for the back circle; it never gains nav.
    back: { type: String, default: '' }
  },
  data: () => ({ logoIcon })
}
</script>
