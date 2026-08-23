<template>
  <label class="flex items-center gap-2 bg-white border border-hairline-strong rounded-field px-3 py-2.5">
    <svg
      class="h-4 w-4 flex-none text-ink-subtle"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      aria-hidden="true"
    >
      <circle
        cx="9"
        cy="9"
        r="6"
      />
      <path d="M14 14l4 4" />
    </svg>
    <input
      v-bind="$attrs"
      :value="modelValue"
      :placeholder="PLACEHOLDERS[scope]"
      type="search"
      class="flex-1 min-w-0 bg-transparent text-body text-ink placeholder:text-ink-subtle outline-none"
      @input="$emit('update:modelValue', $event.target.value)"
    >
    <span
      v-if="hint"
      class="text-[11px] text-ink-faint"
    >{{ hint }}</span>
  </label>
</template>

<script>
// Two placeholders, no more: global finds feeds, scoped narrows a visible list.
const PLACEHOLDERS = {
  global: 'Search or RSS URL…',
  scoped: 'Filter these entries…'
}

export default {
  // Labels and the like belong on the control, not the wrapper.
  inheritAttrs: false,
  props: {
    modelValue: {
      type: String,
      default: ''
    },
    scope: {
      type: String,
      default: 'global',
      validator: (value) => Object.keys(PLACEHOLDERS).includes(value)
    },
    hint: {
      type: String,
      default: ''
    }
  },
  emits: ['update:modelValue'],
  data: () => ({ PLACEHOLDERS })
}
</script>
