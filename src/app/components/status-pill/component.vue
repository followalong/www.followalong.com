<template>
  <span :class="`inline-flex items-center rounded-pill px-3 py-1 text-[11px] font-semibold ${THEMES[status]}`">
    <slot />
  </span>
</template>

<script>
const THEMES = {
  following: 'bg-following-bg text-following',
  installed: 'bg-following-bg text-following',
  paused: 'bg-surface-sunken text-ink-muted',
  tag: 'bg-surface-sunken text-ink-muted',
  warning: 'bg-danger-bg text-warning'
}

export default {
  props: {
    status: {
      type: String,
      default: 'tag',
      validator: (value) => Object.keys(THEMES).includes(value)
    }
  },
  data: () => ({ THEMES })
}
</script>
