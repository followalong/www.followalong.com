<template>
  <label class="block">
    <span
      v-if="label"
      class="block text-meta font-bold tracking-wide uppercase text-ink-subtle"
    >{{ label }}</span>

    <component
      :is="multiline ? 'textarea' : 'input'"
      v-bind="$attrs"
      :value="modelValue"
      :rows="multiline ? rows : undefined"
      :class="`block w-full rounded-field border bg-white px-3 py-2.5 text-body text-ink outline-none placeholder:text-ink-subtle ${
        label ? 'mt-2' : ''
      } ${invalid ? 'border-danger' : 'border-hairline-strong focus:border-primary'}`"
      @input="$emit('update:modelValue', $event.target.value)"
    />

    <span
      v-if="hint"
      :class="`block mt-1.5 text-meta ${invalid ? 'text-danger' : 'text-ink-muted'}`"
    >{{ hint }}</span>
  </label>
</template>

<script>
export default {
  // Labels and ids belong on the control, not the wrapper.
  inheritAttrs: false,
  props: {
    modelValue: { type: String, default: '' },
    label: { type: String, default: '' },
    hint: { type: String, default: '' },
    invalid: { type: Boolean, default: false },
    multiline: { type: Boolean, default: false },
    rows: { type: Number, default: 6 }
  },
  emits: ['update:modelValue']
}
</script>
