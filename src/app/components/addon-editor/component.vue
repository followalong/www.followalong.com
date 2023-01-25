<template>
  <PageCard>
    <template #title>
      <p class="font-medium text-gray-900">
        {{ addon.title }}
      </p>
    </template>
    <template #content>
      <div class="prose">
        <p>
          {{ addon.description }}
        </p>
        <p class="font-bold">
          Using: {{ currentAdapterPreview }}
        </p>
        <button
          :aria-label="`Configure ${addon.type}`"
          class="block float-right rounded-md border border-transparent bg-indigo-100 px-4 py-2 font-medium text-indigo-700 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:text-sm ml-1"
          @click="modalOpen = true"
        >
          Configure
        </button>
      </div>
      <Modal
        v-if="modalOpen"
        :app="app"
        :identity="identity"
        :title="`Configure ${addon.title}`"
      >
        <template #content>
          <form
            class="space-y-6"
            :aria-label="`Save ${addon.type}`"
            @submit.prevent="save"
          >
            <div>
              <label
                for="email"
                class="block text-sm font-medium text-gray-700"
              >Choose an adapter</label>
              <div class="mt-1">
                <select
                  v-model="newAdapterData.type"
                  required
                  class="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  :aria-label="`Configure ${addon.type} adapter`"
                >
                  <option
                    v-for="adapter in addon.adapters"
                    :key="adapter.key"
                    :value="adapter.name"
                  >
                    {{ app.queries.adapterName(adapter) }}
                  </option>
                </select>
              </div>
            </div>

            <div
              v-for="(field, key) in selectedAdapter.FIELDS"
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
                  v-model="newAdapterData.data[key]"
                  :aria-label="`Configure ${addon.type} ${key}`"
                  :name="`input-${key}`"
                  :type="field.type"
                  :autocomplete="field.autocomplete"
                  :required="field.required"
                  :placeholder="field.placeholder"
                  class="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                >
              </div>
            </div>
          </form>
        </template>
        <template #actions>
          <button
            type="submit"
            class="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:ml-3 sm:w-auto"
          >
            Save configuration
          </button>
          <button
            type="button"
            class="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto"
            @click="modalOpen = false"
          >
            Cancel
          </button>
        </template>
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
  props: ['app', 'identity', 'addon'],
  data () {
    return {
      modalOpen: false,
      currentAdapterData: {},
      newAdapterData: {}
    }
  },
  computed: {
    selectedAdapter () {
      return this.app.queries.findAdapter(this.newAdapterData.type)
    },
    currentAdapterPreview () {
      return this.app.queries.adapterForAddonForIdentity(this.identity, this.addon.type).preview()
    }
  },
  watch: {
    modalOpen () {
      const currentAdapterData = this.app.queries.adapterDataForIdentityAndAddon(this.identity, this.addon.type)

      this.currentAdapterData = currentAdapterData
      this.newAdapterData = Object.assign({}, currentAdapterData)
    },
    selectedAdapter () {
      const Adapter = this.selectedAdapter
      this.newAdapterData.data = new Adapter().data
    }
  },
  methods: {
    save () {
      this.app.commands.saveAddonDataForIdentity(this.identity, this.addon.type, this.newAdapterData)
      this.modalOpen = false
    }
  }
}
</script>
