import { createApp } from 'vue'
import App from './app/component.vue'
import router from './app/router/index.js'
import { takeHandoffFromLocation } from './queries/handoff.js'

const handoffHash = takeHandoffFromLocation(window.location, window.history)

createApp(App, { handoffHash }).use(router).mount('#app')
