<template>
  <article class="article" v-if="p">
    <RouterLink to="/problems" class="back"><i class="mdi mdi-arrow-left"></i> 全部问题</RouterLink>
    <div class="chips">
      <span v-for="t in p.tags" :key="t" class="chip">{{ t }}</span>
    </div>
    <h1>{{ p.title }}</h1>
    <p class="lead">{{ p.summary }}</p>
    <h2>症状</h2>
    <ul><li v-for="s in p.symptoms" :key="s">{{ s }}</li></ul>
    <h2>常见原因</h2>
    <ul><li v-for="c in p.causes" :key="c">{{ c }}</li></ul>
    <h2>处理步骤</h2>
    <ol class="steps">
      <li v-for="s in p.steps" :key="s">{{ s }}</li>
    </ol>
  </article>
  <p v-else>未找到该问题。</p>
</template>

<script>
import { problems } from '../data/problems.js'

export default {
  computed: {
    p() { return problems.find((x) => x.id === this.$route.params.id) }
  }
}
</script>

<style scoped>
.back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--text-muted);
  text-decoration: none;
  margin-bottom: 12px;
}
.chips { display: flex; gap: 6px; margin-bottom: 8px; }
</style>
