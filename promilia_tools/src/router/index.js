import { createRouter, createWebHistory } from 'vue-router'

/**
 * History 路由便于搜索引擎收录（hash 片段不会进入索引）。
 * 纯静态托管请配置 SPA fallback：GitHub Pages 使用构建产物中的 404.html；
 * Nginx 示例：try_files $uri $uri.html $uri/ /index.html;
 * 旧版 hash 链接会在进入应用时重写为 history 路径。
 */
function redirectLegacyHashHistory() {
  if (typeof window === 'undefined') return
  const raw = window.location.hash
  if (!raw.startsWith('#/')) return
  const pathAndQuery = raw.slice(1)
  const base = import.meta.env.BASE_URL || '/'
  const prefix = base.endsWith('/') ? base.slice(0, -1) : base
  window.history.replaceState(null, '', `${prefix}${pathAndQuery}`)
}

redirectLegacyHashHistory()

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
    path: '/encyclopedia/qibo/:id',
    name: 'qibo-detail',
    component: () => import('@/views/encyclopedia/QiboDetailView.vue'),
    meta: { titleKey: 'nav.qibo' },
  },
  {
    path: '/encyclopedia/:type',
    name: 'encyclopedia-placeholder',
    component: () => import('@/views/PlaceholderView.vue'),
    meta: { titleKey: 'nav.encyclopedia', noindex: true },
  },
  {
    path: '/guides/:type',
    name: 'guides',
    component: () => import('@/views/PlaceholderView.vue'),
    meta: { titleKey: 'nav.guides', noindex: true },
  },
  {
    path: '/story/:type',
    name: 'story',
    component: () => import('@/views/PlaceholderView.vue'),
    meta: { titleKey: 'nav.story', noindex: true },
  },
  {
    path: '/tools/:type',
    name: 'tools',
    component: () => import('@/views/PlaceholderView.vue'),
    meta: { titleKey: 'nav.tools', noindex: true },
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
    meta: { noindex: true },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  if (to.path.length > 1 && to.path.endsWith('/')) {
    return { path: to.path.replace(/\/+$/, ''), query: to.query, hash: to.hash, replace: true }
  }
})

export default router
