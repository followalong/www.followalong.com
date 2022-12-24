import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router'
import Home from '../views/home/component.vue'
import Feed from '../views/feed/component.vue'

const routes = [
  {
    path: '/:feedUrl(.*)',
    name: 'redirect',
    component: Feed,
    props: true
  },
  {
    path: '/',
    name: 'home',
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
