<template>
  <div class="sources" v-if="items && items.length">
    <h3><i class="mdi mdi-open-in-new"></i> 延伸阅读 / 来源</h3>
    <a v-for="s in items" :key="s.url" :href="s.url" target="_blank" rel="noopener">
      <i class="mdi mdi-link-variant"></i>
      {{ s.title }}
    </a>
  </div>
</template>

<script>
export default {
  props: { items: { type: Array, default: () => [] } }
}
</script>
