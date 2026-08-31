<template>
  <div class="article">
    <h1>面试高频问题</h1>
    <p class="lead">按 TA / 图形程序向整理。先自己答一遍，再展开对照。求职时能用项目里的数字（ms、Draw Call）举例会更有说服力。</p>
    <div class="item" v-for="(it, i) in interviews" :key="i" :id="'q-' + i">
      <button class="q" @click="open = open === i ? -1 : i">
        <span>{{ i + 1 }}. {{ it.q }}</span>
        <span class="tags">
          <span v-for="t in it.tags" :key="t" class="chip">{{ t }}</span>
        </span>
        <i class="mdi" :class="open === i ? 'mdi-chevron-up' : 'mdi-chevron-down'"></i>
      </button>
      <div v-show="open === i" class="a">{{ it.a }}</div>
    </div>
  </div>
</template>

<script>
import { interviews } from '../data/interview.js'

export default {
  data() {
    return { interviews, open: -1 }
  },
  mounted() {
    const q = this.$route.query.q
    if (q !== undefined) {
      const i = Number(q)
      if (!Number.isNaN(i)) this.open = i
    }
  },
  watch: {
    '$route.query.q'(v) {
      const i = Number(v)
      if (!Number.isNaN(i)) this.open = i
    }
  }
}
</script>

<style scoped>
.item {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  margin-bottom: 8px;
  background: var(--bg-elevated);
  overflow: hidden;
}
.q {
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  color: var(--text);
  padding: 12px 14px;
  cursor: pointer;
  display: flex;
  gap: 10px;
  align-items: flex-start;
  font-size: 14px;
}
.q span:first-child { flex: 1; }
.tags { display: flex; gap: 4px; flex-wrap: wrap; }
.q i { color: var(--text-muted); }
.a {
  padding: 0 14px 14px;
  color: var(--text-muted);
  font-size: 14px;
  border-top: 1px solid var(--border);
  padding-top: 12px;
}
</style>
