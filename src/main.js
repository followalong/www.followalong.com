import { createApp } from 'vue'
import App from './app/component.vue'
import router from './app/router/index.js'
import { bootWithLinks } from './queries/links.js'

// The address may carry credentials (a setup link) or a sign in code. Both
// leave the address bar before the app mounts and the router looks.
bootWithLinks({ window, router }, (handoffHash) => createApp(App, { handoffHash }).use(router).mount('#app'))
