<template>
  <div class="code">
    <div class="meta">
      <span>{{ lang }}</span>
      <button class="btn" @click="copy">{{ copied ? '已复制' : '复制' }}</button>
    </div>
    <pre><code ref="code" class="hljs"></code></pre>
  </div>
</template>

<script>
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import cpp from 'highlight.js/lib/languages/cpp'
import csharp from 'highlight.js/lib/languages/csharp'
import glsl from 'highlight.js/lib/languages/glsl'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('cpp', cpp)
hljs.registerLanguage('c', cpp)
hljs.registerLanguage('hlsl', cpp)
hljs.registerLanguage('csharp', csharp)
hljs.registerLanguage('cs', csharp)
hljs.registerLanguage('glsl', glsl)

export default {
  props: {
    lang: { type: String, default: 'text' },
    code: { type: String, required: true }
  },
  data() {
    return { copied: false }
  },
  watch: {
    code: { immediate: true, handler() { this.$nextTick(this.highlight) } },
    lang() { this.$nextTick(this.highlight) }
  },
  methods: {
    highlight() {
      const el = this.$refs.code
      if (!el) return
      let html
      try {
        html = hljs.highlight(this.code.replace(/^\n/, '').replace(/\n$/, ''), {
          language: this.lang === 'hlsl' ? 'cpp' : this.lang
        }).value
      } catch {
        html = this.escape(this.code)
      }
      el.innerHTML = html
    },
    escape(s) {
      return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
    },
    async copy() {
      try {
        await navigator.clipboard.writeText(this.code)
        this.copied = true
        setTimeout(() => (this.copied = false), 1200)
      } catch {}
    }
  }
}
</script>

<style scoped>
.code {
  margin: 14px 0 20px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}
.meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border);
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-family: var(--mono);
}
pre {
  margin: 0;
  padding: 12px 14px;
  overflow: auto;
  font-size: 13px;
  line-height: 1.55;
  font-family: var(--mono);
  background: #0d1117;
}
code { font-family: inherit; }
.btn { height: 24px; font-size: 11px; letter-spacing: 0; text-transform: none; }
</style>
