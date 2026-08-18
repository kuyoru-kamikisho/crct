<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import SvgIcon from '@jamescoyle/vue-icon'
import { mdiFilter, mdiFilterOutline } from '@mdi/js'
import {
  characters,
  countActiveCharacterFilters,
  createEmptyCharacterFilters,
  matchCharacterFilters,
} from '@/data/characters'
import CharacterFilter from '@/components/encyclopedia/CharacterFilter.vue'
import { replaceRp } from '@/utils/replaceRp'

const { t } = useI18n()
const q = ref('')
const filterOpen = ref(false)
const filters = ref(createEmptyCharacterFilters())

const activeFilterCount = computed(() => countActiveCharacterFilters(filters.value))

const filtered = computed(() => {
  const s = q.value.trim().toLowerCase()
  return characters.filter((c) => {
    if (!matchCharacterFilters(c, filters.value)) return false
    if (!s) return true
    return (
      c.name.toLowerCase().includes(s) ||
      c.nameEn.toLowerCase().includes(s) ||
      c.elements.some((e) => e.includes(s)) ||
      c.profession.includes(s)
    )
  })
})

const characterSummary = computed(() => {
  const total = characters.length
  const fiveStar = characters.filter((c) => c.rarity === 5).length
  const fourStar = characters.filter((c) => c.rarity === 4).length
  return replaceRp(t('character.summary'), total, fiveStar, fourStar)
})

function cardStyle(character) {
  return {
    backgroundImage: `url(/imgs/characters/${character.id}.png)`,
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
  }
}
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1>{{ t('character.title') }}</h1>
        <p>{{ characterSummary }}</p>
        <p>{{ t('character.npcHint') }}</p>
      </div>
      <div class="page-tools">
        <button
          type="button"
          class="filter-toggle"
          :class="{ on: filterOpen, active: activeFilterCount }"
          :aria-label="t('common.filter')"
          :aria-expanded="filterOpen"
          @click="filterOpen = !filterOpen"
        >
          <svg-icon
            type="mdi"
            :size="18"
            :path="filterOpen || activeFilterCount ? mdiFilter : mdiFilterOutline"
          />
          <span v-if="activeFilterCount" class="filter-badge">{{ activeFilterCount }}</span>
        </button>
        <input v-model="q" type="search" class="search" :placeholder="t('common.search')" />
      </div>
    </header>

    <Transition name="filter-drop">
      <CharacterFilter v-if="filterOpen" v-model="filters" />
    </Transition>

    <div class="grid">
      <router-link v-for="c in filtered" :key="c.id" :to="`/encyclopedia/characters/${c.id}`" class="card">
        <div class="background" :style="cardStyle(c)"></div>
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
.page {
  min-width: 0;
}

.page-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-end;
  margin-bottom: 20px;
  flex-wrap: wrap;

  h1 {
    margin: 0 0 4px;
    font-size: clamp(18px, 5vw, 22px);
  }

  p {
    margin: 0;
    color: var(--c-text-muted);
    font-size: 13px;
  }

  @media (max-width: 719px) {
    flex-direction: column;
    align-items: stretch;
  }
}

.page-tools {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;

  @media (max-width: 719px) {
    width: 100%;
  }
}

.filter-toggle {
  position: relative;
  flex: 0 0 36px;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: $radius-sm;
  border: 1px solid var(--c-border);
  background: var(--c-surface);
  color: var(--c-text-muted);
  cursor: pointer;
  transition:
    color 0.18s,
    border-color 0.18s,
    background 0.18s,
    box-shadow 0.18s;

  :deep(svg) {
    fill: currentColor;
  }

  &:hover,
  &.on {
    color: var(--c-accent-soft);
    border-color: color-mix(in srgb, var(--c-accent) 55%, var(--c-border));
    background: color-mix(in srgb, var(--c-accent) 12%, var(--c-surface));
  }

  &.active {
    color: var(--c-accent);
    box-shadow: 0 0 12px color-mix(in srgb, var(--c-accent) 18%, transparent);
  }
}

.filter-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--c-accent);
  color: var(--c-bg);
  font-size: 10px;
  font-weight: 700;
  line-height: 16px;
  text-align: center;
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
}

.filter-drop-enter-active,
.filter-drop-leave-active {
  transition:
    opacity 0.24s ease,
    transform 0.24s ease;
}

.filter-drop-enter-from,
.filter-drop-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 168px), 1fr));
  gap: 12px;
}

.card {
  position: relative;
  min-width: 0;
  overflow: hidden;
  padding: 18px 16px 16px;
  border-radius: $radius-md;
  border: 1px solid var(--c-border);
  background: var(--c-surface);
  color: var(--c-text);
  transition:
    transform 0.18s,
    border-color 0.18s,
    box-shadow 0.18s;

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      transform: translateY(-3px);
      border-color: var(--c-accent);
      box-shadow: var(--shadow-glow);
      color: var(--c-text);
    }
  }

  * {
    position: relative;
    z-index: 1;
  }

  .background {
    position: absolute;
    width: 100%;
    height: 100%;
    left: 0;
    top: 0;
    opacity: 0.4;
    z-index: 0;
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
