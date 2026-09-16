<script setup>
import HexagonRadarCard from '@/components/rank/HexagonRadarCard.vue'

defineProps({
  items: { type: Array, default: () => [] },
  maxScore: { type: Number, default: 1 },
  loading: { type: Boolean, default: false },
  emptyText: { type: String, default: '' },
  loadingText: { type: String, default: '' },
  hint: { type: String, default: '' },
})
</script>

<template>
  <section class="board">
    <p v-if="hint" class="lead">{{ hint }}</p>
    <p v-if="loading" class="empty">{{ loadingText }}</p>
    <p v-else-if="!items.length" class="empty">{{ emptyText }}</p>
    <div v-else class="grid">
      <HexagonRadarCard v-for="item in items" :key="item.id" :item="item" :max-score="maxScore" />
    </div>
  </section>
</template>

<style scoped lang="scss">
.lead {
  margin: 0 0 12px;
  color: var(--c-star);
  font-size: 13px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
  gap: 10px;
}

.empty {
  margin: 24px 0;
  text-align: center;
  color: var(--c-text-muted);
  font-size: 13px;
}
</style>
