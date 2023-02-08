import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router'
import Home from '../views/home/component.vue'
import Feed from '../views/feed/component.vue'
import Following from '../views/following/component.vue'
import Help from '../views/help/component.vue'
import Settings from '../views/settings/component.vue'
import Signal from '../views/signal/component.vue'
import Addons from '../views/addons/component.vue'
import Marketplace from '../views/marketplace/component.vue'

const routes = [
  {
    path: '/settings',
    component: Settings,
    props: true
  },
  {
    path: '/help',
    component: Help,
    props: true
  },
  {
    path: '/marketplace',
    component: Marketplace,
    props: true
  },
  {
    path: '/following',
    component: Following,
    props: true
  },
  {
    path: '/signals/:signal',
    component: Signal,
    props: true
  },
  {
    path: '/add-ons',
    component: Addons,
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
