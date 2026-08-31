<template>
  <div class="home">
    <section class="hero">
      <p class="kicker">给转行 TA 的图形直觉课</p>
      <h1>就算从未学过，<br />也能看懂技术美术。</h1>
      <p class="lead">
        公式下面有字母含义，每个知识点都有可拖、可转的演示器。
        面向有前端经验、零基础转 TA 的人，把数学、管线、光照和求职材料放在一条路上。
      </p>
      <div class="actions">
        <RouterLink class="btn btn-accent" to="/learn/coords">从坐标系开始</RouterLink>
        <RouterLink class="btn" to="/learn">看完整学习路线</RouterLink>
      </div>
    </section>

    <section class="grid3">
      <div class="card" v-for="c in cards" :key="c.to">
        <i class="mdi" :class="c.icon"></i>
        <h3>{{ c.title }}</h3>
        <p>{{ c.desc }}</p>
        <RouterLink :to="c.to">进入 →</RouterLink>
      </div>
    </section>

    <section>
      <h2>建议路径</h2>
      <p class="muted">按这个顺序点，演示器会把「为什么」画出来。不必一天读完。</p>
      <ol class="path">
        <li v-for="a in articles" :key="a.slug">
          <RouterLink :to="'/learn/' + a.slug">{{ a.title }}</RouterLink>
          <span>{{ a.summary }}</span>
        </li>
      </ol>
    </section>
  </div>
</template>

<script>
import { articles } from '../data/knowledge.js'

export default {
  data() {
    return {
      articles,
      cards: [
        { icon: 'mdi-function-variant', title: '14 个知识点', desc: '数学 → 管线 → 光照 → Unity 实践，每页都有演示器。', to: '/learn' },
        { icon: 'mdi-alert-decagram-outline', title: '现场问题', desc: '洋红材质、Draw Call、Z-Fighting、发灰……对照着改。', to: '/problems' },
        { icon: 'mdi-comment-quote-outline', title: '面试题', desc: '点乘叉乘、MVP、PBR、合批、线性空间，按 TA 岗高频整理。', to: '/interview' },
        { icon: 'mdi-download', title: '工具', desc: '引擎、DCC、RenderDoc、Shadertoy 下载与文档入口。', to: '/tools' },
        { icon: 'mdi-account-group', title: '作品集社区', desc: 'ArtStation、80LV、Polycount，以及中文检索入口。', to: '/community' },
        { icon: 'mdi-magnify', title: '站内搜索', desc: 'Ctrl+K 搜标题和关键字，直接跳到对应页。', to: '/learn' }
      ]
    }
  }
}
</script>

<style scoped>
.hero { max-width: 720px; margin-bottom: 40px; }
.kicker {
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 10px;
}
.hero h1 { font-size: clamp(28px, 4vw, 40px); line-height: 1.25; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
.actions a { text-decoration: none; }
.grid3 {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
  margin: 28px 0 40px;
}
.card {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  background: var(--bg-elevated);
}
.card i { font-size: 22px; color: var(--accent); }
.card h3 { margin: 8px 0 6px; font-size: 15px; }
.card p { font-size: 13px; color: var(--text-muted); }
.path { list-style: none; padding: 0; }
.path li {
  display: grid;
  gap: 4px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}
.path span { font-size: 13px; color: var(--text-muted); }
</style>
