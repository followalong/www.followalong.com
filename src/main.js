import { createApp } from 'vue'
import App from './app/component.vue'
import router from './app/router/index.js'
import './registerServiceWorker'

createApp(App).use(router).mount('#app')
