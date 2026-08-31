<template>
  <div class="article">
    <h1>学习路线</h1>
    <p class="lead">按前端转 TA 的顺序排：先建立空间直觉，再看 GPU 怎么画，然后写光照和 Shader，最后在 Unity 里跑通第一张材质。</p>
    <section v-for="ch in chapters" :key="ch.id" class="ch">
      <h2><i class="mdi" :class="ch.icon"></i> {{ ch.title }}</h2>
      <div class="list">
        <RouterLink v-for="a in articlesOf(ch.id)" :key="a.slug" :to="'/learn/' + a.slug" class="row">
          <span class="t">{{ a.title }}</span>
          <span class="s">{{ a.summary }}</span>
        </RouterLink>
      </div>
    </section>
  </div>
</template>

<script>
import { articlesOf, chapters } from '../data/knowledge.js'

export default {
  data() {
    return { chapters }
  },
  methods: { articlesOf }
}
</script>

<style scoped>
.ch { margin-top: 8px; }
.ch h2 { display: flex; align-items: center; gap: 8px; }
.list { display: grid; gap: 8px; }
.row {
  display: grid;
  gap: 4px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-elevated);
  color: var(--text);
  text-decoration: none;
}
.row:hover { border-color: var(--accent-dim); text-decoration: none; }
.t { font-size: 15px; }
.s { font-size: 13px; color: var(--text-muted); }
</style>
