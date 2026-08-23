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
          Import from followalong.net
        </p>
      </template>
      <template
        #content
      >
        <div class="prose">
          <p>
            On the old app, open Settings and choose <em>Download Identity</em>,
            then pick that file here. Your feeds and saved entries are merged in;
            anything already here is left alone, so importing twice is safe.
          </p>
          <div class="mt-5">
            <input
              id="import-legacy"
              ref="legacyFile"
              type="file"
              accept="application/json,.json"
              aria-label="Import identity file"
              class="block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-100 file:px-4 file:py-2 file:font-medium file:text-blue-700 hover:file:bg-blue-200"
              @change="importLegacy"
            >
          </div>
          <p
            v-if="importResult"
            aria-label="Import result"
            class="mt-4 text-sm"
            :class="importFailed ? 'text-red-700' : 'text-green-700'"
          >
            {{ importResult }}
          </p>
        </div>
      </template>
    </PageCard>

    <PageCard>
      <template #title>
        <p class="font-medium text-gray-900">
          Roll up this identity
        </p>
      </template>
      <template
        #content
      >
        <div class="prose">
          <p>
            Clean up the local database for better performance.
          </p>
          <div class="mt-5">
            <button
              type="button"
              class="rounded-md border border-transparent bg-orange-100 px-4 py-2 font-medium text-orange-700 hover:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 sm:text-sm"
              aria-label="Roll up identity"
              @click="rollUpIdentity"
            >
              Roll up this identity
            </button>
          </div>
        </div>
      </template>
    </PageCard>

    <PageCard>
      <template #title>
        <p class="font-medium text-gray-900">
          Forget this identity
        </p>
      </template>
      <template
        #content
      >
        <div class="prose">
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

  data () {
    return {
      importResult: null,
      importFailed: false
    }
  },

  methods: {
    importLegacy (event) {
      const file = event.target.files && event.target.files[0]

      if (!file) return

      this.importResult = 'Reading...'
      this.importFailed = false

      return this.app.queries.readJsonFile(file)
        .then((data) => {
          const report = this.app.commands.importLegacyIdentity(this.identity, data)

          this.importFailed = false
          this.importResult = `Imported ${report.feedsCreated} new feed${report.feedsCreated === 1 ? '' : 's'} ` +
            `and ${report.entriesCreated} entr${report.entriesCreated === 1 ? 'y' : 'ies'}, ` +
            `marked ${report.saved} saved. ` +
            `${report.feedsReused} feed${report.feedsReused === 1 ? ' was' : 's were'} already here.`
        })
        .catch((e) => {
          this.importFailed = true
          this.importResult = e.message
        })
    },

    forgetIdentity () {
      this.app.confirm('Are you sure you want to remove this identity?')
        .then(() => this.app.commands.forgetIdentity(this.identity))
        .then(() => this.app.setIdentity(this.app.queries.allIdentities()[0]))
        .then(() => this.$router.push('/'))
        .catch(() => {})
    },

    rollUpIdentity () {
      this.app.confirm('Are you sure you want to roll up this identity?')
        .then(() => this.app.commands.createProjectionForIdentity(this.identity))
        .then(() => this.$router.push('/'))
        .catch(() => {})
    }
  }
}
</script>
