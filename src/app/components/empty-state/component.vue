<template>
  <div
    data-empty-state
    class="px-4 py-8 md:px-0 text-center"
  >
    <p class="text-body text-ink-secondary max-w-read mx-auto">
      <slot />
    </p>
    <div
      v-if="$slots.action"
      class="mt-3 flex justify-center"
    >
      <slot name="action" />
    </div>
  </div>
</template>

<script>
export default {}
</script>
