<template>
  <div class="p-4 md:p-6 flex flex-col gap-4 max-w-[560px]">
    <div class="bg-white border border-hairline-strong rounded-xl p-4 md:p-5">
      <h2 class="text-[14px] font-bold text-ink">
        Contact us via email
      </h2>
      <p class="text-body text-ink-secondary mt-1.5">
        Email us at
        <a
          href="mailto:followalong@protonmail.com"
          class="text-primary font-semibold"
        >followalong@protonmail.com</a>
        for a quick response.
      </p>
    </div>
  </div>
</template>

<script>
export default {
  props: ['app', 'identity']
}
</script>
