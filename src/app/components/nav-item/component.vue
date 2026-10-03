<template>
  <router-link
    :to="to"
    :aria-label="label"
    :aria-current="active ? 'page' : null"
    :class="`min-h-touch flex flex-col items-center justify-center gap-1 rounded-nav px-3.5 py-1.5 transition-colors duration-150 ${
      on === 'chrome' && active ? 'bg-chrome-deep' : ''
    }`"
  >
    <svg
      data-nav-icon
      :class="`h-icon w-icon flex-none ${active ? 'text-accent' : ICON_REST[on]}`"
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
  // The same bookmark the card's save control draws, filled.
  saved: 'M5.5 3.25h9a.75.75 0 01.75.75v12.4a.4.4 0 01-.62.34L10 13.6l-4.63 3.14a.4.4 0 01-.62-.34V4a.75.75 0 01.75-.75z',
  you: 'M10 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0 1.5c-3.3 0-6 1.9-6 4.2 0 .7.6 1.3 1.3 1.3h9.4c.7 0 1.3-.6 1.3-1.3 0-2.3-2.7-4.2-6-4.2Z'
}

// The same item sits on the teal bar (tablet) and on white (mobile tabs);
// only what it must contrast against changes.
const ICON_REST = { chrome: 'text-chrome-dim', surface: 'text-inactive' }
const LABEL_REST = { chrome: 'text-white/90 font-medium', surface: 'text-ink-subtle font-medium' }
const LABEL_ACTIVE = { chrome: 'text-white font-semibold', surface: 'text-primary font-semibold' }

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
