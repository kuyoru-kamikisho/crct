<template>
  <div class="article">
    <h1>工作时容易遇到的问题</h1>
    <p class="lead">这些不是教科书习题，是项目里会反复出现的坑。对照症状定位，再按步骤收口。</p>
    <div class="list">
      <RouterLink v-for="p in problems" :key="p.id" :to="'/problems/' + p.id" class="row">
        <div class="top">
          <strong>{{ p.title }}</strong>
          <span v-for="t in p.tags" :key="t" class="chip">{{ t }}</span>
        </div>
        <p>{{ p.summary }}</p>
      </RouterLink>
    </div>
  </div>
</template>

<script>
import { problems } from '../data/problems.js'

export default {
  data() {
    return { problems }
  }
}
</script>

<style scoped>
.list { display: grid; gap: 8px; }
.row {
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-elevated);
  color: var(--text);
  text-decoration: none;
}
.row:hover { border-color: var(--accent-dim); text-decoration: none; }
.top { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-bottom: 6px; }
.row p { margin: 0; font-size: 13px; color: var(--text-muted); }
</style>
