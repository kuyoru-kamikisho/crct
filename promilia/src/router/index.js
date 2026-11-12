import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/views/skillsimulation',
    },
    {
      path: '/views/skillsimulation',
      name: 'skillsimulation',
      component: () => import('../views/skillsimulation.vue'),
    },
  ],
})

export default router
