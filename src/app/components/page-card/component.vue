<template>
  <section
    class="block mb-8"
    aria-labelledby="applicant-information-title"
  >
    <div class="bg-white shadow md:rounded-lg">
      <div class="px-4 py-5 sm:px-6">
        <div :class="`flex ${centerVertically ? 'items-center' : ''} justify-between`">
          <slot name="title" />
          <slot name="meta" />
        </div>
      </div>
      <div
        v-if="$slots.content"
        :class="`border-t border-gray-200 ${hasPadding ? 'px-4 py-5 sm:px-6' : ''} max-w-none`"
      >
        <slot name="content" />
      </div>
    </div>
  </section>
</template>

<script>
export default {
  props: {
    hasPadding: {
      type: Boolean,
      default: true
    },
    centerVertically: {
      type: Boolean,
      default: true
    }
  }
}
</script>
