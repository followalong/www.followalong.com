<template>
  <router-link
    :to="to"
    :aria-label="label"
    :aria-current="active ? 'page' : null"
    :class="`min-h-touch flex flex-col items-center justify-center gap-1 rounded-[10px] px-3.5 py-1.5 ${
      on === 'chrome' && active ? 'bg-accent/[0.14]' : ''
    }`"
  >
    <svg
      data-nav-icon
      :class="`h-[18px] w-[18px] flex-none ${active ? 'text-accent' : ICON_REST[on]}`"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path :d="ICONS[icon] || ICONS.home" />
    </svg>
    <span
      data-nav-label
      :class="`text-nav ${active ? LABEL_ACTIVE[on] : LABEL_REST[on]}`"
    >{{ label }}</span>
  </router-link>
</template>

<script>
const ICONS = {
  home: 'M10 2.5 2.5 8.4V17a1 1 0 0 0 1 1h4v-5h5v5h4a1 1 0 0 0 1-1V8.4L10 2.5Z',
  feeds: 'M4 3.5A1.5 1.5 0 0 0 2.5 5v10A1.5 1.5 0 0 0 4 16.5h12A1.5 1.5 0 0 0 17.5 15V5A1.5 1.5 0 0 0 16 3.5H4Zm1.5 3h9v2h-9v-2Zm0 4h9v1.5h-9V10.5Zm0 3.5h5.5v1.5H5.5V14Z',
  market: 'M3 3.5h14a1 1 0 0 1 1 1.2l-.8 3.1A2.2 2.2 0 0 1 15 9.5a2.2 2.2 0 0 1-2-1.2 2.2 2.2 0 0 1-4 0 2.2 2.2 0 0 1-4 0 2.2 2.2 0 0 1-2.2 1.2L2 5.7a1 1 0 0 1 1-2.2Zm0.5 7.6V16a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-4.9a3.7 3.7 0 0 1-3 .2 3.7 3.7 0 0 1-4 0 3.7 3.7 0 0 1-4 0 3.7 3.7 0 0 1-2 -0.2Z',
  you: 'M10 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0 1.5c-3.3 0-6 1.9-6 4.2 0 .7.6 1.3 1.3 1.3h9.4c.7 0 1.3-.6 1.3-1.3 0-2.3-2.7-4.2-6-4.2Z'
}

// The same item sits on the teal bar (tablet) and on white (mobile tabs);
// only what it must contrast against changes.
const ICON_REST = { chrome: 'text-chrome-dim', surface: 'text-inactive' }
const LABEL_REST = { chrome: 'text-chrome-muted font-semibold', surface: 'text-ink-subtle font-semibold' }
const LABEL_ACTIVE = { chrome: 'text-white font-bold', surface: 'text-primary font-bold' }

export default {
  props: {
    to: { type: String, required: true },
    label: { type: String, required: true },
    icon: { type: String, default: 'home' },
    active: { type: Boolean, default: false },
    on: {
      type: String,
      default: 'surface',
      validator: (value) => ['chrome', 'surface'].includes(value)
    }
  },
  data: () => ({ ICONS, ICON_REST, LABEL_REST, LABEL_ACTIVE })
}
</script>
