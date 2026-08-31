<template>
  <div>
    <component v-if="comp" :is="comp" />
    <p v-else-if="missing">未找到该知识点。</p>
    <p v-else class="muted">加载中…</p>
  </div>
</template>

<script>
import { findArticle } from '../data/knowledge.js'

export default {
  data() {
    return { comp: null, missing: false }
  },
  watch: {
    '$route.params.slug': { immediate: true, handler: 'load' }
  },
  methods: {
    async load() {
      const slug = this.$route.params.slug
      this.comp = null
      this.missing = false
      const a = findArticle(slug)
      if (!a) {
        this.missing = true
        return
      }
      try {
        const mod = await a.component()
        if (this.$route.params.slug !== slug) return
        this.comp = mod.default
      } catch (e) {
        console.error(e)
        if (this.$route.params.slug === slug) this.missing = true
      }
    }
  }
}
</script>
