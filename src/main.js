import { createApp } from 'vue'
import App from './app/component.vue'
import router from './app/router/index.js'
import './register-service-worker'

createApp(App).use(router).mount('#app')
