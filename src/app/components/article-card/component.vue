<template>
  <Card as="article">
    <section
      v-for="(part, index) in parts"
      :key="part.title"
      :class="index ? 'mt-6 pt-6 border-t border-hairline-soft' : ''"
    >
      <h2 class="text-card font-bold text-ink">
        {{ part.title }}
      </h2>
      <p
        v-for="(paragraph, i) in part.body"
        :key="i"
        class="text-body text-ink-secondary mt-2 leading-relaxed max-w-read"
      >
        {{ paragraph }}
      </p>
    </section>
  </Card>
</template>

<script>
import Card from '../card/component.vue'

// A page of titled sections: About, Terms, Privacy. Plain text only.
export default {
  components: { Card },
  props: {
    parts: { type: Array, required: true }
  }
}
</script>
