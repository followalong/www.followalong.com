import { createApp } from 'vue'
import App from './app/component.vue'
import router from './app/router/index.js'
import addIcons from './add-icons.js'
import './register-service-worker'

addIcons(createApp(App)).use(router).mount('#app')
