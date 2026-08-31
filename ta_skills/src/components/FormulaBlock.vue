<template>
  <div class="formula">
    <div ref="math" class="math"></div>
    <div class="syms" v-if="symbols.length">
      <div class="syms-title">符号含义</div>
      <div v-for="(s, i) in symbols" :key="i" class="row">
        <span class="sym" v-html="inline(s.s)"></span>
        <span class="desc">{{ s.d }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import katex from 'katex'

export default {
  props: {
    latex: { type: String, required: true },
    symbols: { type: Array, default: () => [] }
  },
  mounted() {
    this.render()
  },
  watch: {
    latex: { immediate: true, handler() { this.$nextTick(this.render) } }
  },
  methods: {
    render() {
      if (!this.$refs.math) return
      katex.render(this.latex, this.$refs.math, {
        throwOnError: false,
        displayMode: true
      })
    },
    inline(src) {
      return katex.renderToString(src, { throwOnError: false, displayMode: false })
    }
  }
}
</script>

<style scoped>
.formula {
  margin: 16px 0 20px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--bg-elevated);
}
.math {
  padding: 16px 12px;
  overflow-x: auto;
  color: var(--text);
}
.syms {
  border-top: 1px solid var(--border);
  padding: 8px 0;
  background: #0e1117;
}
.syms-title {
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--text-dim);
  padding: 4px 14px 6px;
  text-transform: uppercase;
}
.row {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 12px;
  padding: 4px 14px;
  font-size: 13px;
  align-items: center;
}
.sym { color: var(--accent); }
.desc { color: var(--text-muted); }
</style>
