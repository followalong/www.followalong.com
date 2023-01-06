<template>
  <section
    class="block mb-8"
    aria-labelledby="applicant-information-title"
  >
    <div class="bg-white shadow sm:rounded-lg">
      <div class="px-4 py-5 sm:px-6">
        <div class="flex justify-between">
          <div class="flex space-x-3 flex-shrink-0">
            <slot name="title" />
          </div>
        </div>
      </div>
      <div class="border-t border-gray-200 px-4 py-5 sm:px-6 prose max-w-none">
        <slot name="content" />
      </div>
    </div>
  </section>
</template>

<script>
export default {
}
</script>
