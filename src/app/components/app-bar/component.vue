<template>
  <header class="bg-chrome sticky top-0 z-40">
    <div class="h-bar px-4 flex items-stretch gap-3">
      <router-link
        v-if="back"
        data-bar-back
        :to="back"
        aria-label="Back"
        class="flex-none flex items-center"
      >
        <span class="h-slot w-slot rounded-full bg-white/10 flex items-center justify-center text-chrome-icon text-base font-bold">
          ←
        </span>
      </router-link>

      <!-- Logo and title are one target, the full height of the bar. -->
      <router-link
        data-bar-home
        to="/"
        aria-label="Follow Along home"
        class="flex-1 min-w-0 flex items-center gap-3 -ml-2 pl-2 rounded-nav"
      >
        <img
          v-if="!back"
          data-bar-logo
          :src="logoIcon"
          class="h-slot w-slot flex-none"
          alt=""
        >
        <h1
          aria-label="Page title"
          class="text-title font-semibold text-white min-w-0 truncate"
        >
          {{ title }}
        </h1>
      </router-link>

      <slot name="nav" />

      <div
        data-bar-slot
        class="h-slot min-w-slot flex-none self-center flex items-center justify-end gap-2"
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
