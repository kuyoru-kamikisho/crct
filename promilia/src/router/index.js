import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  BASE_URL: './',
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/views/skillsimulation',
      component: () => import('../views/skillsimulation.vue')
    }
  ],
})

export default router
