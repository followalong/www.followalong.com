<template>
  <PageBody>
    <Card>
      <h2 class="text-sm font-bold text-ink">
        Contact us via email
      </h2>
      <p class="text-body text-ink-secondary mt-1.5">
        Email us at
        <a
          href="mailto:followalong@protonmail.com"
          class="text-primary font-semibold"
        >followalong@protonmail.com</a>
        for a quick response.
      </p>
    </Card>
  </PageBody>
</template>

<script>
import PageBody from '../../components/page-body/component.vue'
import Card from '../../components/card/component.vue'

export default {
  components: { PageBody, Card },
  props: ['app', 'identity']
}
</script>
