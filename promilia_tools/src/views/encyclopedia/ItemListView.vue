<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import SvgIcon from '@jamescoyle/vue-icon'
import { mdiFilter, mdiFilterOutline, mdiStar } from '@mdi/js'
import {
  ALL_ITEMS_SOURCE_ID,
  countActiveItemFilters,
  createEmptyItemFilters,
  getItemFilterOptions,
  getItemsBySource,
  getItemSource,
  matchItemFilters,
} from '@/data/items'
import ItemFilter from '@/components/encyclopedia/ItemFilter.vue'
import AppBreadcrumb from '@/components/common/AppBreadcrumb.vue'
import { replaceRp } from '@/utils/replaceRp'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const q = ref(typeof route.query.q === 'string' ? route.query.q : '')
const filterOpen = ref(false)
const filters = ref(createEmptyItemFilters())

const sourceId = computed(() => {
  const value = route.params.source
  return typeof value === 'string' && value ? value : ALL_ITEMS_SOURCE_ID
})
const source = computed(() => getItemSource(sourceId.value))
const pageTitle = computed(() => source.value?.name || t('item.title'))
const sourceList = computed(() => getItemsBySource(sourceId.value))
const isAll = computed(() => sourceId.value === ALL_ITEMS_SOURCE_ID)
const sourceMissing = computed(() => !isAll.value && !source.value)

const crumbs = computed(() => [
  { to: '/', label: t('nav.home') },
  { label: pageTitle.value },
])

watch(
  () => route.query.q,
  (value) => {
    if (typeof value === 'string' && value !== q.value) q.value = value
    if (value == null && q.value) q.value = ''
  },
)

watch(q, (value) => {
  const next = value.trim()
  const current = typeof route.query.q === 'string' ? route.query.q : ''
  if (next === current || (!next && !current)) return
  const query = { ...route.query }
  if (next) query.q = next
  else delete query.q
  router.replace({ query })
})

watch(sourceId, () => {
  filters.value = createEmptyItemFilters()
  filterOpen.value = false
})

const filterOptions = computed(() => getItemFilterOptions(sourceList.value))
const activeFilterCount = computed(() => countActiveItemFilters(filters.value))

const filtered = computed(() => {
  const s = q.value.trim().toLowerCase()
  return sourceList.value.filter((item) => {
    if (!matchItemFilters(item, filters.value)) return false
    if (!s) return true
    const haystack = [
      item.name,
      item.id,
      item.desc,
      item.spdesc,
      ...(item.types || []),
      ...(item.tags || []),
      ...(item.ways || []),
      ...(item.effects || []),
    ]
    return haystack.some((part) => String(part || '').toLowerCase().includes(s))
  })
})

const summary = computed(() => {
  if (isAll.value) return replaceRp(t('item.summary'), sourceList.value.length)
  return replaceRp(t('item.sourceSummary'), pageTitle.value, sourceList.value.length)
})

function starLabel(item) {
  return replaceRp(t('item.filterRarity'), item.rarity || 0)
}

function itemTo(item) {
  return {
    name: 'item-detail',
    params: { id: item.id },
    query: isAll.value ? {} : { from: sourceId.value },
  }
}

function onIconError(event) {
  event.target.style.display = 'none'
}
</script>

<template>
  <div v-if="sourceMissing" class="page">
    <p class="empty">{{ t('common.empty') }}</p>
    <p class="empty"><router-link to="/encyclopedia/items">{{ t('item.title') }}</router-link></p>
  </div>
  <div v-else class="page">
    <AppBreadcrumb :items="crumbs" :label="t('header.breadcrumb')" />
    <header class="page-head">
      <div>
        <h1>{{ pageTitle }}</h1>
        <p>{{ summary }}</p>
        <p v-if="isAll">{{ t('item.catalogHint') }}</p>
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
      <ItemFilter v-if="filterOpen" v-model="filters" :options="filterOptions" />
    </Transition>

    <div class="grid">
      <router-link v-for="item in filtered" :key="item.id" :to="itemTo(item)" class="card">
        <div class="thumb" :class="`rarity-${item.rarity || 0}`">
          <img
            v-if="item.image"
            :src="item.image"
            :alt="item.name"
            width="96"
            height="96"
            loading="lazy"
            decoding="async"
            @error="onIconError"
          />
        </div>
        <div class="rarity" :title="starLabel(item)">
          <svg-icon
            v-for="n in item.rarity || 0"
            :key="n"
            type="mdi"
            :size="12"
            :path="mdiStar"
          />
        </div>
        <h2>{{ item.name }}</h2>
        <div class="tags">
          <span v-for="type in (item.types || []).slice(0, 3)" :key="type" class="tag">{{ type }}</span>
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
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 156px), 1fr));
  gap: 12px;
}

.card {
  position: relative;
  min-width: 0;
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 16px 12px 14px;
  border-radius: $radius-md;
  border: 1px solid var(--c-border);
  background: var(--c-surface);
  color: var(--c-text);
  text-decoration: none;
  text-align: center;
  overflow: hidden;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      transform: translateY(-4px);
      border-color: var(--c-accent);
      box-shadow: var(--shadow-glow);
      color: var(--c-text);

      .thumb img {
        transform: scale(1.06);
      }
    }
  }

  @media (prefers-reduced-motion: reduce) {
    transition: border-color 0.16s ease, box-shadow 0.16s ease;

    &:hover {
      transform: none;
    }
  }
}

.thumb {
  width: 88px;
  height: 88px;
  display: grid;
  place-items: center;
  border-radius: 18px;
  background:
    radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--c-accent) 22%, transparent), transparent 70%),
    rgba(0, 0, 0, 0.22);

  img {
    width: 72px;
    height: 72px;
    object-fit: contain;
    filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.35));
    transition: transform 0.22s ease;
  }

  &.rarity-5 {
    background:
      radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--c-star) 28%, transparent), transparent 72%),
      rgba(0, 0, 0, 0.22);
  }

  &.rarity-4 {
    background:
      radial-gradient(circle at 50% 30%, color-mix(in srgb, #c9a2ff 26%, transparent), transparent 72%),
      rgba(0, 0, 0, 0.22);
  }
}

.rarity {
  display: flex;
  justify-content: center;
  gap: 1px;
  min-height: 12px;
  color: var(--c-star);

  :deep(svg) {
    fill: currentColor;
  }
}

h2 {
  margin: 0;
  font-size: 14px;
  font-weight: 650;
  line-height: 1.35;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px;
}

.tag {
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(62, 207, 207, 0.12);
  color: var(--c-accent-soft);
}

.empty {
  color: var(--c-text-muted);
  text-align: center;
  padding: 40px;
}
</style>
