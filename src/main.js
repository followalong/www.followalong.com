import { createApp } from 'vue'
import App from './app/component.vue'
import router from './app/router/index.js'

createApp(App).use(router).mount('#app')
