<template>
  <Card>
    <div class="flex items-center gap-2">
      <h2 class="flex-1 text-sm font-bold text-ink">
        {{ addon.title }}
      </h2>
      <StatusPill
        v-for="label in app.queries.labelsForAddon(addon)"
        :key="`${addon.id}-label-${label}`"
        status="tag"
      >
        <span v-html="label" />
      </StatusPill>
    </div>

    <p class="text-chip text-ink-secondary mt-1.5 leading-snug">
      {{ addon.preview }}
    </p>

    <div class="flex gap-2 mt-3">
      <StatusPill
        v-if="addon.id"
        status="installed"
        class="!rounded-lg !px-3 !py-1.5 !text-chip"
      >
        Installed ✓
      </StatusPill>

      <Button
        :variant="addon.id ? 'secondary' : 'primary'"
        :aria-label="`Configure ${addonKey}`"
        class="!py-1.5 !px-3 !text-chip"
        @click="modalOpen = true"
      >
        {{ buttonText }}
      </Button>
    </div>

    <Sheet
      :open="modalOpen"
      :title="addon.title"
      @close="modalOpen = false"
    >
      <form
        :id="formId"
        class="flex flex-col gap-4"
        :aria-label="`Save ${addonKey}`"
        @submit.prevent="save"
      >
        <div
          class="prose prose-sm"
          v-html="app.queries.sanitizeCopy(addon.description)"
        />

        <TextField
          v-for="(field, key) in addon.fields"
          :key="`field-${key}`"
          v-model="newAdapterConfig.data[key]"
          :label="field.label"
          :aria-label="`Configure ${addonKey} ${key}`"
          :name="`input-${key}`"
          :type="field.type"
          :autocomplete="field.autocomplete"
          :required="field.required"
          :placeholder="field.placeholder"
        />
      </form>

      <template #footer>
        <Button
          v-if="!addon.id || hasFields"
          type="submit"
          :form="formId"
          class="flex-1"
          @click="save"
        >
          {{ submitText }}
        </Button>
        <Button
          v-if="addon.id"
          variant="destructive"
          :aria-label="`Uninstall ${addonKey}`"
          @click="uninstall"
        >
          Uninstall
        </Button>
      </template>
    </Sheet>
  </Card>
</template>

<script>
import Sheet from '../sheet/component.vue'
import Button from '../button/component.vue'
import StatusPill from '../status-pill/component.vue'
import Card from '../card/component.vue'
import TextField from '../text-field/component.vue'

export default {
  components: {
    Sheet,
    Button,
    StatusPill,
    Card,
    TextField
  },
  props: ['app', 'identity', 'addon', 'buttonText', 'submitText'],
  data () {
    return {
      modalOpen: false,
      newAdapterConfig: { data: {} }
    }
  },
  computed: {
    addonKey () {
      return this.addon.type
    },
    formId () {
      return `addon-form-${this.addonKey}`
    },
    hasFields () {
      return Object.keys(this.addon.fields).length
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
      // The app's confirm, not the global one: it is injectable, and the raw
      // window.confirm silently did nothing here.
      this.app.confirm('Are you sure you want to remove this addon?')
        .then(() => {
          this.app.commands.removeAddonFromIdentity(this.identity, this.addon)
          this.modalOpen = false
        })
        .catch(() => {})
    }
  }
}
</script>
