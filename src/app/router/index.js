import { createRouter, createWebHistory } from 'vue-router'
import About from '@/app/views/about/component.vue'
import Changelog from '@/app/views/changelog/component.vue'
import FeedsIndex from '@/app/views/feeds/index/component.vue'
import FeedsShow from '@/app/views/feeds/show/component.vue'
import Help from '@/app/views/help/component.vue'
import Home from '@/app/views/home/component.vue'
import IdentitiesNew from '@/app/views/identities/new/component.vue'
import IdentitiesShow from '@/app/views/identities/show/component.vue'
import ItemsShow from '@/app/views/items/show/component.vue'
import Saved from '@/app/views/saved/component.vue'
import Search from '@/app/views/search/component.vue'
import Addons from '@/app/views/addons/component.vue'
import Settings from '@/app/views/settings/component.vue'
import Welcome from '@/app/views/welcome/component.vue'

const routes = [
  {
    path: '/me',
    name: 'me',
    component: IdentitiesShow,
    props: true
  },
  {
    path: '/about',
    name: 'about',
    component: About,
    props: true
  },
  {
    path: '/splash',
    name: 'splash',
    component: Welcome,
    props: true
  },
  {
    path: '/search',
    name: 'search',
    component: Search,
    props: true
  },
  {
    path: '/settings',
    name: 'settings',
    component: Settings,
    props: true
  },
  {
    path: '/feeds',
    name: 'feeds',
    component: FeedsIndex,
    props: true
  },
  {
    path: '/saved',
    name: 'saved',
    component: Saved,
    props: true
  },
  {
    path: '/changelog',
    name: 'Changelog',
    component: Changelog,
    props: true
  },
  {
    path: '/identities/new',
    name: 'identities/new',
    component: IdentitiesNew,
    props: true
  },
  {
    path: '/feeds/:feed_url',
    name: 'feed',
    component: FeedsShow,
    props: true
  },
  {
    path: '/feeds/:feed_url/:guid',
    name: 'item',
    component: ItemsShow,
    props: true
  },
  {
    path: '/help',
    name: 'help',
    component: Help,
    props: true
  },
  {
    path: '/addons',
    name: 'addons',
    component: Addons,
    props: true
  },
  {
    path: '/:media_verb',
    name: 'media_verb_home',
    component: Home,
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
  history: createWebHistory(),
  scrollBehavior () {
    return { top: 0, behavior: 'smooth' }
  },
  routes
})

export default router

export {
  routes
}
