<template>
  <Sheet
    :open="open"
    :title="title"
    narrow
    @close="$emit('close')"
  >
    <p class="text-meta text-ink-muted -mt-1 mb-3">
      {{ meta }}
    </p>

    <div
      class="prose"
      :aria-label="`Content for ${entryId}`"
      v-html="content"
    />

    <template #footer>
      <Button
        data-reader-done
        class="flex-1"
        @click="$emit('done')"
      >
        Done ✓
      </Button>
      <Button
        data-reader-skip
        variant="secondary"
        @click="$emit('skip')"
      >
        Skip →
      </Button>
      <a
        v-if="link"
        data-reader-source
        :href="link"
        target="_blank"
        class="rounded-lg px-4 py-2.5 text-body font-semibold border border-hairline-outline text-ink-body"
      >
        Source ↗
      </a>
    </template>
  </Sheet>
</template>

<script>
import Sheet from '../sheet/component.vue'
import Button from '../button/component.vue'

export default {
  components: { Sheet, Button },
  props: {
    open: { type: Boolean, default: false },
    entryId: { type: String, required: true },
    title: { type: String, default: '' },
    meta: { type: String, default: '' },
    content: { type: String, default: '' },
    link: { type: String, default: '' }
  },
  emits: ['close', 'done', 'skip']
}
</script>
