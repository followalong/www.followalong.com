import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router'
import Home from '../views/home/component.vue'
import Feed from '../views/feed/component.vue'
import Settings from '../views/settings/component.vue'

const routes = [
  {
    path: '/settings',
    component: Settings,
    props: true
  },
  {
    path: '/:feedUrl(.*)',
    component: Feed,
    props: true
  },
  {
    path: '/',
    component: Home,
    props: true
  }
]

const router = createRouter({
  history: typeof window !== 'undefined' ? createWebHistory() : createMemoryHistory(),
  scrollBehavior () {
    return { top: 0, behavior: 'smooth' }
  },
  routes
})

export default router

export {
  routes
}
