import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { seoPrerenderPlugin } from './scripts/vite-plugin-seo.js'

export default defineConfig({
  plugins: [vue(), vueJsx(), seoPrerenderPlugin()],
  server: {
    port: 5177,
    proxy: {
      '/vote-api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/vote-api/, ''),
      },
      '/wiki-api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/wiki-api/, ''),
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: (content, filepath) => {
          if (filepath.includes(`${'styles'}/variables`)) return content
          return `@use "@/assets/styles/variables" as *;\n${content}`
        },
      },
    },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/vue') || id.includes('node_modules/vue-router') || id.includes('node_modules/pinia')) {
            return 'vue'
          }
          if (id.includes('node_modules/vue-i18n')) {
            return 'i18n'
          }
          if (id.includes('/src/data/items')) {
            return 'items'
          }
          if (id.includes('/src/data/characters')) {
            return 'characters'
          }
          if (id.includes('/src/data/qibos')) {
            return 'qibos'
          }
        },
      },
    },
  },
})
