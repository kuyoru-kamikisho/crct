import { createRouter, createWebHashHistory } from 'vue-router'

/**
 * 使用 hash 路由，便于纯静态托管（GitHub Pages 等）无需服务端 rewrite
 * 页面均懒加载，保障首屏体积
 */
const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: { titleKey: 'nav.home' },
  },
  {
    path: '/encyclopedia/characters',
    name: 'characters',
    component: () => import('@/views/encyclopedia/CharacterListView.vue'),
    meta: { titleKey: 'nav.characters' },
  },
  {
    path: '/encyclopedia/characters/:id',
    name: 'character-detail',
    component: () => import('@/views/encyclopedia/CharacterDetailView.vue'),
    meta: { titleKey: 'nav.characters' },
  },
  {
    path: '/encyclopedia/qibo',
    name: 'qibo',
    component: () => import('@/views/encyclopedia/QiboListView.vue'),
    meta: { titleKey: 'nav.qibo' },
  },
  {
    path: '/encyclopedia/:type',
    name: 'encyclopedia-placeholder',
    component: () => import('@/views/PlaceholderView.vue'),
    meta: { titleKey: 'nav.encyclopedia' },
  },
  {
    path: '/guides/:type',
    name: 'guides',
    component: () => import('@/views/PlaceholderView.vue'),
    meta: { titleKey: 'nav.guides' },
  },
  {
    path: '/story/:type',
    name: 'story',
    component: () => import('@/views/PlaceholderView.vue'),
    meta: { titleKey: 'nav.story' },
  },
  {
    path: '/tools/:type',
    name: 'tools',
    component: () => import('@/views/PlaceholderView.vue'),
    meta: { titleKey: 'nav.tools' },
  },
  {
    path: '/contribute',
    name: 'contribute',
    component: () => import('@/views/ContributeView.vue'),
    meta: { titleKey: 'nav.contribute' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
  },
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
