<template>
  <div class="article">
    <h1>TA 工具下载</h1>
    <p class="lead">链接指向官网。版本以官网为准。调试类工具建议尽早装，比「再看一周教程」更能涨能力。</p>
    <section v-for="g in groups" :key="g.title">
      <h2>{{ g.title }}</h2>
      <div class="grid">
        <a v-for="t in g.items" :key="t.name" class="card" :href="t.url" target="_blank" rel="noopener">
          <i class="mdi" :class="t.icon"></i>
          <div>
            <strong>{{ t.name }}</strong>
            <p>{{ t.desc }}</p>
          </div>
          <i class="mdi mdi-open-in-new go"></i>
        </a>
      </div>
    </section>
  </div>
</template>

<script>
import { toolGroups } from '../data/tools.js'

export default {
  data() {
    return { groups: toolGroups }
  }
}
</script>

<style scoped>
.grid { display: grid; gap: 8px; }
.card {
  display: grid;
  grid-template-columns: 36px 1fr 20px;
  gap: 10px;
  align-items: center;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-elevated);
  color: var(--text);
  text-decoration: none;
}
.card:hover { border-color: var(--accent-dim); text-decoration: none; }
.card i { font-size: 22px; color: var(--accent); }
.card p { margin: 4px 0 0; font-size: 13px; color: var(--text-muted); }
.go { color: var(--text-dim) !important; font-size: 16px !important; }
</style>
