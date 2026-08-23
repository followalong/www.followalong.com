<template>
  <component
    :is="to ? 'router-link' : (action ? 'button' : 'div')"
    :to="to || undefined"
    :type="action ? 'button' : undefined"
    :aria-label="ariaLabel || undefined"
    data-row
    :class="`w-full text-left bg-white border-b border-hairline-soft last:border-b-0 px-4 py-3.5 flex items-center gap-3 min-h-touch ${muted ? 'opacity-80' : ''}`"
    @click="action && $emit('click')"
  >
    <slot name="leading" />

    <div class="flex-1 min-w-0">
      <div class="text-[14px] font-semibold text-ink truncate">
        {{ title }}
      </div>
      <div
        v-if="meta"
        :class="`text-[11.5px] mt-0.5 truncate ${warn ? 'text-warning' : 'text-ink-muted'}`"
      >
        {{ meta }}
      </div>
    </div>

    <slot name="trailing" />

    <span
      v-if="to"
      data-row-chevron
      class="text-inactive text-sm flex-none"
      aria-hidden="true"
    >›</span>
  </component>
</template>

<script>
export default {
  props: {
    title: { type: String, required: true },
    meta: { type: String, default: '' },
    to: { type: String, default: '' },
    muted: { type: Boolean, default: false },
    warn: { type: Boolean, default: false },
    action: { type: Boolean, default: false },
    ariaLabel: { type: String, default: '' }
  },
  emits: ['click']
}
</script>
