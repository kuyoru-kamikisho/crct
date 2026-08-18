import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { seoPrerenderPlugin } from './scripts/vite-plugin-seo.js'

export default defineConfig({
  plugins: [vue(), vueJsx(), seoPrerenderPlugin()],
  server: {
    port: 5177,
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
        },
      },
    },
  },
})
