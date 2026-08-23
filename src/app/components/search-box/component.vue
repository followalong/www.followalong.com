<template>
  <label class="flex items-center gap-2 h-9 bg-white border border-hairline-strong rounded-field px-3 focus-within:border-primary">
    <svg
      class="h-3.5 w-3.5 flex-none text-ink-subtle"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      aria-hidden="true"
    >
      <circle
        cx="7"
        cy="7"
        r="4.75"
      />
      <path d="M10.5 10.5 14 14" />
    </svg>
    <input
      v-bind="$attrs"
      :value="modelValue"
      :placeholder="PLACEHOLDERS[scope]"
      type="text"
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
      class="flex-1 min-w-0 bg-transparent text-field leading-none text-ink placeholder:text-ink-subtle outline-none"
      @input="$emit('update:modelValue', $event.target.value)"
    >
    <button
      v-if="modelValue"
      type="button"
      aria-label="Clear search"
      class="flex-none text-ink-subtle text-field leading-none px-1 -mr-1"
      @click="$emit('update:modelValue', '')"
    >
      ✕
    </button>
    <span
      v-else-if="hint"
      class="flex-none text-tiny text-ink-faint"
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
