<template>
  <Teleport to="body">
    <div v-if="modelValue" class="overlay" @click.self="close">
      <div class="box">
        <div class="bar">
          <i class="mdi mdi-magnify"></i>
          <input
            ref="input"
            v-model="q"
            placeholder="搜索知识、问题、面试、工具…"
            @keydown="onKey"
          />
          <kbd>Esc</kbd>
        </div>
        <div class="list" v-if="hits.length">
          <button
            v-for="(h, i) in hits"
            :key="h.type + h.title + h.to"
            class="hit"
            :class="{ on: i === idx }"
            @click="go(h)"
            @mouseenter="idx = i"
          >
            <span class="type">{{ h.type }}</span>
            <span class="title">{{ h.title }}</span>
            <span class="hint">{{ h.hint }}</span>
          </button>
        </div>
        <div v-else-if="q.trim()" class="empty">没有匹配结果</div>
        <div v-else class="empty">输入关键字，例如「点乘」「PBR」「洋红」</div>
      </div>
    </div>
  </Teleport>
</template>

<script>
import { buildSearchIndex, searchItems } from '../data/search.js'

const INDEX = buildSearchIndex()

export default {
  props: { modelValue: Boolean },
  emits: ['update:modelValue'],
  data() {
    return { q: '', idx: 0 }
  },
  computed: {
    hits() {
      return searchItems(INDEX, this.q)
    }
  },
  watch: {
    modelValue(v) {
      if (v) {
        this.q = ''
        this.idx = 0
        this.$nextTick(() => this.$refs.input && this.$refs.input.focus())
      }
    },
    hits() {
      this.idx = 0
    }
  },
  methods: {
    close() {
      this.$emit('update:modelValue', false)
    },
    go(h) {
      this.$router.push(h.to)
      this.close()
    },
    onKey(e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        this.idx = Math.min(this.idx + 1, this.hits.length - 1)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        this.idx = Math.max(this.idx - 1, 0)
      } else if (e.key === 'Enter' && this.hits[this.idx]) {
        this.go(this.hits[this.idx])
      }
    }
  }
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 50;
  display: flex;
  justify-content: center;
  padding: 12vh 16px 16px;
}
.box {
  width: min(640px, 100%);
  background: var(--bg-elevated);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
}
.bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
}
.bar i { font-size: 20px; color: var(--text-muted); }
.bar input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: var(--text);
  font-size: 15px;
}
.list { max-height: 420px; overflow: auto; }
.hit {
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  border-bottom: 1px solid var(--border);
  padding: 10px 14px;
  cursor: pointer;
  color: var(--text);
  display: grid;
  grid-template-columns: 48px 1fr;
  grid-template-rows: auto auto;
  column-gap: 10px;
}
.hit.on { background: var(--accent-soft); }
.type {
  grid-row: 1 / 3;
  align-self: center;
  font-size: 11px;
  color: var(--accent);
  font-family: var(--mono);
}
.title { font-size: 14px; }
.hint {
  grid-column: 2;
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.empty {
  padding: 28px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}
</style>
