<template>
  <form
    aria-label="Save storage settings"
    @submit.prevent="submit"
  >
    <div class="field">
      <label>Where is your data saved?</label>
      <select
        v-model="newConfig.type"
        aria-label="Storage settings Strategy"
      >
        <option
          v-for="(adapter, id) in adapters"
          :key="id"
          :value="id"
        >
          {{ adapter.NAME }}
        </option>
      </select>
    </div>

    <div v-if="selectedAdapter">
      <div
        v-for="(field, fieldName) in selectedAdapter.FIELDS"
        :key="`${selectedAdapter.NAME}-${field.label}`"
        class="field"
      >
        <label
          :for="`${selectedAdapter.NAME}-${fieldName}`"
          v-html="field.label"
        />
        <textarea
          v-if="newConfig.type === 'textarea'"
          :id="`${selectedAdapter.NAME}-${fieldName}`"
          v-model="newConfig.data[fieldName]"
          :aria-label="`Storage settings ${field.label}`"
          :type="field.type"
          :placeholder="getPlaceholder(fieldName)"
          :required="field.required"
        />
        <input
          v-else
          :id="`${selectedAdapter.NAME}-${fieldName}`"
          v-model="newConfig.data[fieldName]"
          :aria-label="`Storage settings ${field.label}`"
          :type="field.type"
          :placeholder="getPlaceholder(fieldName)"
          :required="field.required"
          :list="`${selectedAdapter.NAME}-${fieldName}-list`"
        >
        <datalist :id="`${selectedAdapter.NAME}-${fieldName}-list`">
          <option
            v-for="suggestion in field.suggestions"
            :key="`${selectedAdapter.NAME}-${fieldName}-${suggestion}`"
            :value="suggestion"
          />
        </datalist>
      </div>
    </div>

    <div class="action">
      <button type="submit">
        {{ buttonText || 'Save storage settings' }}
      </button>
    </div>
  </form>
</template>

<script>
import Adapters from './adapters/index.js'

export default {
  props: ['onSave', 'onVerify', 'adapters', 'config', 'saveKey', 'namespace', 'storageSettings', 'buttonText'],

  Adapters,

  data () {
    return {
      newConfig: {}
    }
  },

  computed: {
    selectedAdapter () {
      return this.adapters[this.newConfig.type]
    }
  },

  mounted () {
    this.newConfig = Object.assign({ type: Object.keys(this.adapters)[0], data: {} }, this.config)
  },

  methods: {
    getPlaceholder (key) {
      if (this.selectedAdapter && this.selectedAdapter.FIELDS && this.selectedAdapter.FIELDS[key] && typeof this.selectedAdapter.FIELDS[key].placeholder !== 'undefined') {
        return this.selectedAdapter.FIELDS[key].placeholder
      } else {
        return ''
      }
    },

    submit () {
      return this.storageSettings.verify(this.newConfig)
        .then((content) => this.onVerify(content))
        .then(() => this.storageSettings.set(this.saveKey, this.newConfig, this.namespace))
        .then(() => this.onSave(this.newConfig))
        .catch((e) => alert(e.message))
    }
  }
}
</script>
