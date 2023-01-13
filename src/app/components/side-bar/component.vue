<template>
  <div class="side-bar fixed overflow-y-auto border-b border-gray-200 top-0 left-0 bottom-0 bg-white mt-8 p-6 md:w-64 md:flex-shrink-0 md:border-b-0 md:border-r md:border-gray-200">
    <div class="sticky top-0 flex min-h-0 flex-1 flex-col">
      <div class="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
        <NavLinks
          :app="app"
          :identity="identity"
        />
      </div>
    </div>
  </div>
</template>

<script>
import NavLinks from '../nav-links/component.vue'

export default {
  components: {
    NavLinks
  },
  props: ['app', 'identity']
}
</script>
