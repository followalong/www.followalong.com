<template>
  <PageCard>
    <template #title>
      <div>
        <p class="font-medium text-gray-900">
          {{ addon.title }}
          <span
            v-for="label in app.queries.labelsForAddon(addon)"
            :key="`${addon.id}-label-${label}`"
            class="inline-flex items-center ml-2 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
            v-html="label"
          />
        </p>
        <p
          class="mt-1 text-sm text-gray-500"
        >
          {{ addon.preview }}
        </p>
      </div>
    </template>
    <template #meta>
      <div>
        <button
          :aria-label="`Configure ${addonKey}`"
          class="block float-right rounded-md border border-transparent bg-indigo-100 -m-2 px-4 py-2 font-medium text-indigo-700 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:text-sm ml-1"
          @click="modalOpen = true"
        >
          {{ buttonText }}
        </button>
      </div>
    </template>
    <template #content>
      <div
        class="prose"
        v-html="app.queries.sanitizeCopy(addon.description)"
      />
      <Modal
        v-if="modalOpen"
        :app="app"
        :identity="identity"
        :title="`${addon.title}`"
      >
        <template #content>
          <form
            class="space-y-6"
            :aria-label="`Save ${addonKey}`"
            @submit.prevent="save"
          >
            <div
              class="prose"
              v-html="app.queries.sanitizeCopy(addon.description)"
            />
            <div
              v-for="(field, key) in addon.fields"
              :key="`field-${key}`"
            >
              <label
                :for="`input-${key}`"
                class="block text-sm font-medium text-gray-700"
                v-html="field.label"
              />
              <div class="mt-1">
                <input
                  :id="`input-${key}`"
                  v-model="newAdapterConfig.data[key]"
                  :aria-label="`Configure ${addonKey} ${key}`"
                  :name="`input-${key}`"
                  :type="field.type"
                  :autocomplete="field.autocomplete"
                  :required="field.required"
                  :placeholder="field.placeholder"
                  class="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                >
              </div>
            </div>

            <div class="sm:flex justify-between">
              <div>
                <a
                  v-if="addon.id"
                  href="javascript:;"
                  class="mb-4 sm:mb-0 inline-flex w-full justify-center rounded-md border border-transparent bg-red-100 px-4 py-2 font-medium text-red-700 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  @click="uninstall"
                >
                  Uninstall
                </a>
              </div>
              <div class="sm:flex sm:flex-row-reverse">
                <button
                  type="submit"
                  class="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:ml-3 sm:w-auto"
                >
                  {{ submitText }}
                </button>
                <button
                  type="button"
                  class="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto"
                  @click="modalOpen = false"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </template>
        <template #actions />
      </Modal>
    </template>
  </PageCard>
</template>

<script>
import Modal from '../../components/modal/component.vue'
import PageCard from '../../components/page-card/component.vue'

export default {
  components: {
    Modal,
    PageCard
  },
  props: ['app', 'identity', 'addon', 'buttonText', 'submitText'],
  data () {
    return {
      modalOpen: false,
      newAdapterConfig: {}
    }
  },
  computed: {
    addonKey () {
      return this.addon.id || this.addon.type
    }
  },
  watch: {
    modalOpen () {
      this.newAdapterConfig = { id: this.addon.id, type: this.addon.type, data: Object.assign({}, this.addon.data) }
    }
  },
  methods: {
    save () {
      this.app.commands.saveAddonForIdentity(this.identity, this.newAdapterConfig)
      this.modalOpen = false
      this.$router.push('/add-ons')
    },

    uninstall () {
      if (confirm('Are you sure you want to remove this addon?')) {
        this.app.commands.removeAddonFromIdentity(this.identity, this.addon)
        this.modalOpen = false
      }
    }
  }
}
</script>
