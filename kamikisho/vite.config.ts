import {fileURLToPath, URL} from 'node:url'
import {defineConfig} from 'vite'
import legacy from '@vitejs/plugin-legacy'
import vue2 from '@vitejs/plugin-vue2'
import Components from 'unplugin-vue-components/vite'
import {VuetifyResolver} from 'unplugin-vue-components/resolvers'

export default defineConfig({
    base: './',
    publicDir: 'public',
    plugins: [
        vue2(),
        Components({
            dts: false,
            dirs: [],
            resolvers: [VuetifyResolver()],
        }),
        legacy({
            targets: ['last 2 versions', 'not dead', '> 5%'],
            additionalLegacyPolyfills: ['regenerator-runtime/runtime']
        })
    ],
    build: {
        cssCodeSplit: true,
        assetsInlineLimit: 4096,
        modulePreload: {
            polyfill: false,
        },
        rollupOptions: {
            output: {
                dir: 'dist',
                entryFileNames: '[hash].js',
                chunkFileNames: 'chunks/[hash].js',
                assetFileNames: 'assets/[hash][extname]',
                manualChunks(id) {
                    if (id.includes('node_modules/vue/') || id.includes('node_modules/vuex/')) {
                        return 'vue'
                    }
                },
            },
        },
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        }
    }
})
