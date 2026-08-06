import { defineConfig } from 'vite'
import coffee from 'coffeescript'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function isCoffee(id) {
  return /\.coffee([?#]|$)/.test(id)
}

function coffeePlugin() {
  return {
    name: 'vite-plugin-coffee',
    enforce: 'pre',
    async resolveId(source, importer) {
      if (!source.endsWith('.coffee') && !source.includes('.coffee?')) return null
      const resolved = path.resolve(
        importer ? path.dirname(importer.split('?')[0]) : __dirname,
        source.split('?')[0]
      )
      if (fs.existsSync(resolved)) return resolved
      return null
    },
    transform(code, id) {
      if (!isCoffee(id)) return null
      const filename = id.split('?')[0]
      try {
        const compiled = coffee.compile(code, {
          bare: true,
          sourceMap: true,
          filename,
          header: false
        })
        return {
          code: compiled.js,
          map: compiled.v3SourceMap
        }
      } catch (err) {
        this.error(`CoffeeScript compile error in ${filename}:\n${err}`)
      }
    }
  }
}

export default defineConfig({
  plugins: [coffeePlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    },
    extensions: ['.coffee', '.js', '.json', '.scss', '.css']
  },
  server: {
    host: true,
    port: 5173
  },
  optimizeDeps: {
    exclude: []
  }
})
