import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import { routes } from './router.js'
import '@mdi/font/css/materialdesignicons.min.css'
import 'katex/dist/katex.min.css'
import 'highlight.js/styles/github-dark.css'
import './styles/global.css'

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

createApp(App).use(router).mount('#app')
