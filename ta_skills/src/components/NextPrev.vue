<template>
  <div class="pager">
    <RouterLink v-if="prev" :to="'/learn/' + prev.slug">
      <span class="dir">← 上一篇</span>
      <span>{{ prev.title }}</span>
    </RouterLink>
    <span v-else></span>
    <RouterLink v-if="next" :to="'/learn/' + next.slug" style="text-align:right">
      <span class="dir">下一篇 →</span>
      <span>{{ next.title }}</span>
    </RouterLink>
  </div>
</template>

<script>
import { neighbors } from '../data/knowledge.js'

export default {
  props: { slug: String },
  computed: {
    n() { return neighbors(this.slug) },
    prev() { return this.n.prev },
    next() { return this.n.next }
  }
}
</script>
