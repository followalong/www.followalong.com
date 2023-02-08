<template>
  <div
    class="relative z-10"
    aria-labelledby="modal-title"
    role="dialog"
    aria-modal="true"
  >
    <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />

    <div class="fixed inset-0 z-10 overflow-y-auto">
      <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-80 sm:max-w-80">
          <div class="bg-white p-5">
            <div class="p-1 sm:p-3">
              <h3
                id="modal-title"
                class="mb-4 text-lg font-medium leading-6 text-gray-900"
              >
                {{ title }}
              </h3>
              <slot name="content" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: ['app', 'identity', 'title']
}
</script>
