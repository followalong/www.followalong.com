<template>
  <div>
    <PageTitle title="Help">
      <template #description>
        <p>Get support for Follow Along</p>
      </template>
    </PageTitle>

    <PageCard>
      <template #title>
        <p class="font-medium text-gray-900">
          Contact us via email
        </p>
      </template>
      <template
        #content
      >
        <div class="prose">
          <p>
            Email us at followalong@protonmail.com for a quick response.
          </p>
        </div>
      </template>
    </PageCard>
  </div>
</template>

<script>
import PageCard from '../../components/page-card/component.vue'
import PageTitle from '../../components/page-title/component.vue'

export default {
  components: {
    PageCard,
    PageTitle
  },

  props: ['app', 'identity']
}
</script>
