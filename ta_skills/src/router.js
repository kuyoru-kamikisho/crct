export const routes = [
  { path: '/', name: 'home', component: () => import('./pages/Home.vue') },
  { path: '/learn', name: 'learn', component: () => import('./pages/LearnIndex.vue') },
  { path: '/learn/:slug', name: 'article', component: () => import('./pages/Article.vue') },
  { path: '/problems', name: 'problems', component: () => import('./pages/Problems.vue') },
  { path: '/problems/:id', name: 'problem', component: () => import('./pages/ProblemDetail.vue') },
  { path: '/interview', name: 'interview', component: () => import('./pages/Interview.vue') },
  { path: '/tools', name: 'tools', component: () => import('./pages/Tools.vue') },
  { path: '/community', name: 'community', component: () => import('./pages/Community.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]
