<template>
  <div />
</template>

<script>
export default {
  props: ['app', 'identity'],

  beforeMount () {
    if (this.$route.query.feedUrl) {
      return this.$router.push(`/${this.$route.query.feedUrl}`)
    }

    let signal = this.app.queries.signalForIdentity(this.identity, this.$route.query.feedUrl)

    if (!signal) {
      signal = this.app.queries.defaultSignalForIdentity(this.identity)
    }

    return this.$router.push(`/signals/${this.app.queries.permalinkForSignal(signal)}`)
  }
}
</script>
