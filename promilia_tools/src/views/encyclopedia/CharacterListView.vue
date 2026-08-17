<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { characters } from '@/data/characters'
import { replaceRp } from '@/utils/replaceRp'

const { t } = useI18n()
const q = ref('')

const filtered = computed(() => {
  const s = q.value.trim().toLowerCase()
  if (!s) return characters
  return characters.filter(
    (c) =>
      c.name.toLowerCase().includes(s) ||
      c.nameEn.toLowerCase().includes(s) ||
      c.elements.some((e) => e.includes(s)) ||
      c.profession.includes(s),
  )
})

const characterSummary = computed(() => {
  const total = characters.length
  const fiveStar = characters.filter((c) => c.rarity === 5).length
  const fourStar = characters.filter((c) => c.rarity === 4).length
  return replaceRp(t('character.summary'), total, fiveStar, fourStar)
})
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1>{{ t('character.title') }}</h1>
        <p>{{ characterSummary }}</p>
        <p>{{ t('character.npcHint') }}</p>
      </div>
      <input v-model="q" type="search" class="search" :placeholder="t('common.search')" />
    </header>

    <div class="grid">
      <router-link
        v-for="c in filtered"
        :key="c.id"
        :to="`/encyclopedia/characters/${c.id}`"
        class="card"
      >
        <div class="rarity">★ {{ c.rarity }}</div>
        <h2>{{ c.name }}</h2>
        <p class="en">{{ c.nameEn }}</p>
        <div class="tags">
          <span class="tag muted">{{ c.faction }}</span>
          <span v-for="el in c.elements" :key="el" class="tag">{{ el }}</span>
          <span class="tag muted">{{ c.profession }}</span>
        </div>
      </router-link>
    </div>

    <p v-if="!filtered.length" class="empty">{{ t('common.empty') }}</p>
  </div>
</template>

<style scoped lang="scss">
.page-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-end;
  margin-bottom: 20px;
  flex-wrap: wrap;

  h1 {
    margin: 0 0 4px;
    font-size: 22px;
  }

  p {
    margin: 0;
    color: var(--c-text-muted);
    font-size: 13px;
  }
}

.search {
  min-width: 220px;
  height: 36px;
  padding: 0 12px;
  border-radius: $radius-sm;
  border: 1px solid var(--c-border);
  background: var(--c-surface);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.card {
  position: relative;
  padding: 18px 16px 16px;
  border-radius: $radius-md;
  border: 1px solid var(--c-border);
  background: var(--c-surface);
  color: var(--c-text);
  transition:
    transform 0.18s,
    border-color 0.18s,
    box-shadow 0.18s;

  &:hover {
    transform: translateY(-3px);
    border-color: var(--c-accent);
    box-shadow: var(--shadow-glow);
    color: var(--c-text);
  }
}

.rarity {
  position: absolute;
  top: 10px;
  right: 12px;
  font-size: 12px;
  color: var(--c-star);
}

h2 {
  margin: 0 0 2px;
  font-size: 16px;
}

.en {
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--c-text-muted);
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(62, 207, 207, 0.12);
  color: var(--c-accent-soft);

  &.muted {
    background: rgba(255, 255, 255, 0.06);
    color: var(--c-text-muted);
  }
}

.empty {
  color: var(--c-text-muted);
  text-align: center;
  padding: 40px;
}
</style>
