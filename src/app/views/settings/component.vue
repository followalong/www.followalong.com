<template>
  <div>
    <PageTitle title="Settings">
      <template #description>
        <p>Set up your identity for Follow Along</p>
      </template>
    </PageTitle>

    <PageCard>
      <template #title>
        <p class="font-medium text-gray-900">
          Forget this identity
        </p>
      </template>
      <template
        #content
        class="prose"
      >
        <p>
          Forgetting this identity will remove all traces of it on this device.
          Ensure you have a backup before proceeding.
        </p>
        <div class="mt-5">
          <button
            type="button"
            class="rounded-md border border-transparent bg-red-100 px-4 py-2 font-medium text-red-700 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:text-sm"
            aria-label="Forget identity"
            @click="forgetIdentity"
          >
            Forget me!
          </button>
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
