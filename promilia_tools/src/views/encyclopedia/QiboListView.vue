<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { qibos } from '@/data/qibos'

const { t } = useI18n()
const route = useRoute()
const q = ref(typeof route.query.q === 'string' ? route.query.q : '')

watch(
  () => route.query.q,
  (value) => {
    if (typeof value === 'string') q.value = value
  },
)

const filtered = computed(() => {
  const s = q.value.trim().toLowerCase()
  if (!s) return qibos
  return qibos.filter(
    (item) =>
      item.name.toLowerCase().includes(s) ||
      String(item.no).includes(s) ||
      item.elements.some((e) => e.includes(s)),
  )
})
</script>

<template>
  <div class="page">
    <header class="page-head">
      <h1>{{ t('qibo.title') }}</h1>
      <input v-model="q" type="search" class="search" :placeholder="t('common.search')" />
    </header>

    <div class="grid">
      <article v-for="item in filtered" :key="item.id" class="card">
        <div class="no">NO.{{ item.no }}</div>
        <h2>{{ item.name }}</h2>
        <div class="tags">
          <span v-for="el in item.elements" :key="el" class="tag">{{ el }}</span>
        </div>
        <dl>
          <div>
            <dt>{{ t('common.location') }}</dt>
            <dd>{{ item.location }}</dd>
          </div>
          <div>
            <dt>{{ t('common.captureRate') }}</dt>
            <dd>{{ item.captureRate }}</dd>
          </div>
        </dl>
        <p>{{ item.intro }}</p>
      </article>
    </div>
  </div>
</template>

<style scoped lang="scss">
.page {
  min-width: 0;
}

.page-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;

  h1 {
    margin: 0;
    font-size: clamp(18px, 5vw, 22px);
  }

  @media (max-width: 719px) {
    flex-direction: column;
    align-items: stretch;
  }
}

.search {
  flex: 1;
  min-width: 0;
  width: min(220px, 100%);
  height: 36px;
  padding: 0 12px;
  border-radius: $radius-sm;
  border: 1px solid var(--c-border);
  background: var(--c-surface);

  @media (max-width: 719px) {
    width: 100%;
  }
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 180px), 1fr));
  gap: 12px;
}

.card {
  min-width: 0;
  padding: 16px;
  border-radius: $radius-md;
  border: 1px solid var(--c-border);
  background: var(--c-surface);
}

.no {
  font-size: 12px;
  color: var(--c-star);
}

h2 {
  margin: 4px 0 10px;
  font-size: 16px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(62, 207, 207, 0.12);
  color: var(--c-accent-soft);
}

dl {
  margin: 0 0 10px;
  display: grid;
  gap: 6px;

  div {
    display: grid;
    grid-template-columns: 72px 1fr;
    gap: 6px;
    font-size: 12px;
  }

  dt {
    color: var(--c-text-muted);
  }

  dd {
    margin: 0;
  }
}

p {
  margin: 0;
  font-size: 13px;
  color: var(--c-text-muted);
}
</style>
