<template>
  <header class="bg-chrome px-4 py-3 md:px-6 md:py-2.5 flex items-center gap-3 md:gap-4">
    <div
      data-bar-slot
      class="h-[34px] w-[34px] flex-none"
    >
      <router-link
        v-if="back"
        data-bar-back
        :to="back"
        aria-label="Back"
        class="h-[34px] w-[34px] rounded-full bg-white/10 flex items-center justify-center text-chrome-icon text-base font-bold"
      >
        ←
      </router-link>
      <router-link
        v-else
        data-bar-logo
        to="/"
        aria-label="Follow Along home"
        class="block h-[34px] w-[34px]"
      >
        <img
          :src="logoIcon"
          class="h-[34px] w-[34px]"
          alt="Follow Along"
        >
      </router-link>
    </div>

    <h1
      aria-label="Page title"
      class="text-title font-extrabold text-white flex-1 truncate"
    >
      {{ title }}
    </h1>

    <slot name="nav" />

    <div
      data-bar-slot
      class="h-[34px] w-[34px] flex-none flex items-center justify-end"
    >
      <slot name="action" />
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
