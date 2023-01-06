<template>
  <div>
    <PageTitle title="Settings">
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
      <template #content>
        <p>
          Email us at followalong@protonmail.com.
        </p>
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

  props: ['app', 'identity'],

  methods: {
    forgetIdentity () {
      this.app.confirm('Are you sure you want to remove this identity?')
        .then(() => this.app.commands.forgetIdentity(this.identity))
        .then(() => this.$router.push('/'))
        .catch(() => {})
    }
  }
}
</script>
