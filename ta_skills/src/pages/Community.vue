<template>
  <div class="article">
    <h1>作品集与社区</h1>
    <p class="lead">作品集要让人「能打开、能复现、能看出你的判断」。社区用来看别人怎么拆效果，而不是只收藏美图。</p>
    <div class="callout">投递建议：1 个可运行包或视频 + 3 张对比图（优化前/后或灯光开关）+ 一段说明你改了哪段 Shader / 哪次合批。ArtStation 封面不要只放最终美图。</div>
    <a v-for="c in list" :key="c.url" class="row" :href="c.url" target="_blank" rel="noopener">
      <span class="chip">{{ c.kind }}</span>
      <div>
        <strong>{{ c.name }}</strong>
        <p>{{ c.desc }}</p>
      </div>
      <i class="mdi mdi-open-in-new"></i>
    </a>
  </div>
</template>

<script>
import { communities } from '../data/community.js'

export default {
  data() {
    return { list: communities }
  }
}
</script>

<style scoped>
.row {
  display: grid;
  grid-template-columns: 72px 1fr 20px;
  gap: 12px;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
  color: var(--text);
  text-decoration: none;
}
.row:hover { text-decoration: none; color: var(--accent); }
.row p { margin: 4px 0 0; font-size: 13px; color: var(--text-muted); }
.row i { color: var(--text-dim); }
</style>
