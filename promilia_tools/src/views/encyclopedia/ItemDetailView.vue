<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import SvgIcon from '@jamescoyle/vue-icon'
import { mdiStar } from '@mdi/js'
import {
  ALL_ITEMS_SOURCE_ID,
  getItemById,
  getItemsBySource,
  getItemSource,
  itemSourcesOf,
} from '@/data/items'
import { classifyWay } from '@/data/itemSources'
import AppBreadcrumb from '@/components/common/AppBreadcrumb.vue'
import { replaceRp } from '@/utils/replaceRp'

const route = useRoute()
const { t } = useI18n()

const item = computed(() => getItemById(route.params.id))
const fromSourceId = computed(() => {
  const value = route.query.from
  return typeof value === 'string' && value ? value : ALL_ITEMS_SOURCE_ID
})
const fromSource = computed(() => getItemSource(fromSourceId.value) || getItemSource(ALL_ITEMS_SOURCE_ID))
const list = computed(() => getItemsBySource(fromSourceId.value))
const itemIndex = computed(() => list.value.findIndex((entry) => entry.id === item.value?.id))
const prevItem = computed(() => (itemIndex.value > 0 ? list.value[itemIndex.value - 1] : null))
const nextItem = computed(() =>
  itemIndex.value >= 0 && itemIndex.value < list.value.length - 1 ? list.value[itemIndex.value + 1] : null,
)
const relatedSources = computed(() => (item.value ? itemSourcesOf(item.value) : []))
const wayLinks = computed(() => {
  if (!item.value?.ways?.length) return []
  return item.value.ways.map((way) => {
    const classified = classifyWay(way)
    const source = classified ? getItemSource(classified.id) : null
    return {
      way,
      to: source ? source.path : '/encyclopedia/items',
    }
  })
})

const crumbs = computed(() => [
  { to: '/', label: t('nav.home') },
  { to: fromSource.value?.path || '/encyclopedia/items', label: fromSource.value?.name || t('item.title') },
  { label: item.value?.name || t('common.empty') },
])

const imageAlt = computed(() => (item.value ? replaceRp(t('seo.itemImageAlt'), item.value.name) : ''))

function neighborTo(entry) {
  return {
    name: 'item-detail',
    params: { id: entry.id },
    query: fromSourceId.value === ALL_ITEMS_SOURCE_ID ? {} : { from: fromSourceId.value },
  }
}

function onIconError(event) {
  event.target.style.display = 'none'
}
</script>

<template>
  <article v-if="item" class="detail" aria-labelledby="item-heading">
    <AppBreadcrumb :items="crumbs" :label="t('header.breadcrumb')" />

    <header class="hero">
      <div class="showcase" :class="`rarity-${item.rarity || 0}`">
        <img
          v-if="item.image"
          class="icon"
          :src="item.image"
          :alt="imageAlt"
          width="160"
          height="160"
          decoding="async"
          @error="onIconError"
        />
      </div>

      <div class="identity">
        <p class="stars" :aria-label="replaceRp(t('item.filterRarity'), item.rarity || 0)">
          <svg-icon v-for="n in item.rarity || 0" :key="n" type="mdi" :size="16" :path="mdiStar" />
        </p>
        <h1 id="item-heading">{{ item.name }}</h1>
        <div class="tags">
          <span v-for="type in item.types" :key="`type-${type}`" class="tag">{{ type }}</span>
          <span
            v-for="tag in (item.tags || []).filter((tag) => !(item.types || []).includes(tag))"
            :key="`tag-${tag}`"
            class="tag muted"
          >{{ tag }}</span>
        </div>
        <p v-if="item.desc" class="intro">{{ item.desc }}</p>
        <p v-if="item.wikiUrl" class="wiki">
          <a :href="item.wikiUrl" target="_blank" rel="noopener noreferrer">{{ t('item.wiki') }}</a>
        </p>
      </div>
    </header>

    <section v-if="wayLinks.length || relatedSources.length">
      <h2>{{ t('item.ways') }}</h2>
      <div class="chips">
        <router-link v-for="entry in wayLinks" :key="entry.way" :to="entry.to" class="chip">
          {{ entry.way }}
        </router-link>
        <span v-if="!wayLinks.length" class="chip muted">{{ t('item.title') }}</span>
      </div>
    </section>

    <section v-if="item.spdesc">
      <h2>{{ t('item.spdesc') }}</h2>
      <p class="body">{{ item.spdesc }}</p>
    </section>

    <section v-if="item.effects?.length">
      <h2>{{ t('item.effects') }}</h2>
      <ul class="effects">
        <li v-for="(effect, i) in item.effects" :key="i">{{ effect }}</li>
      </ul>
    </section>

    <nav v-if="prevItem || nextItem" class="pager" :aria-label="t('header.quickNav')">
      <router-link v-if="prevItem" class="pager-link" :to="neighborTo(prevItem)">
        <span class="dir">{{ t('item.prev') }}</span>
        <strong>{{ prevItem.name }}</strong>
      </router-link>
      <span v-else class="pager-link is-empty" />
      <router-link v-if="nextItem" class="pager-link next" :to="neighborTo(nextItem)">
        <span class="dir">{{ t('item.next') }}</span>
        <strong>{{ nextItem.name }}</strong>
      </router-link>
    </nav>
  </article>
  <div v-else class="missing">
    <p>{{ t('common.empty') }}</p>
    <router-link to="/encyclopedia/items">{{ t('item.title') }}</router-link>
  </div>
</template>

<style scoped lang="scss">
.detail {
  min-width: 0;
}

.hero {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 22px;
  align-items: start;
  padding: 22px;
  border-radius: $radius-lg;
  border: 1px solid var(--c-border);
  background: var(--c-surface);
  margin-bottom: 24px;
  min-width: 0;

  @media (max-width: 560px) {
    grid-template-columns: minmax(0, 1fr);
    padding: 16px;
    justify-items: center;

    .identity {
      justify-self: stretch;
    }
  }
}

.showcase {
  display: grid;
  place-items: center;
  width: 168px;
  height: 168px;
  border-radius: $radius-md;
  background:
    radial-gradient(circle at 50% 38%, color-mix(in srgb, var(--c-accent) 24%, transparent), transparent 68%),
    rgba(0, 0, 0, 0.22);

  &.rarity-5 {
    background:
      radial-gradient(circle at 50% 38%, color-mix(in srgb, var(--c-star) 32%, transparent), transparent 70%),
      rgba(0, 0, 0, 0.22);
  }

  &.rarity-4 {
    background:
      radial-gradient(circle at 50% 38%, color-mix(in srgb, #c9a2ff 28%, transparent), transparent 70%),
      rgba(0, 0, 0, 0.22);
  }
}

.icon {
  width: 128px;
  height: 128px;
  object-fit: contain;
  filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.4));
}

.stars {
  margin: 0;
  color: var(--c-star);
  display: flex;
  gap: 2px;

  :deep(svg) {
    fill: currentColor;
  }
}

h1 {
  margin: 6px 0 10px;
  font-size: clamp(22px, 6vw, 28px);
}

.intro,
.body {
  margin: 0;
  line-height: 1.75;
  color: var(--c-text);
  white-space: pre-line;
}

.wiki {
  margin: 12px 0 0;
  font-size: 13px;
}

.tags,
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.tag,
.chip {
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

.chip {
  text-decoration: none;
  border: 1px solid color-mix(in srgb, var(--c-accent) 28%, transparent);
  padding: 6px 10px;
  font-size: 12px;

  &:hover {
    color: var(--c-accent);
    border-color: var(--c-accent);
  }
}

section {
  margin-bottom: 22px;
  padding: 18px;
  border-radius: $radius-md;
  border: 1px solid var(--c-border);
  background: rgba(11, 28, 41, 0.35);

  h2 {
    margin: 0 0 10px;
    font-size: 15px;
    color: var(--c-accent-soft);
  }

  .chips {
    margin: 0;
  }
}

.effects {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;

  li {
    padding: 10px 12px;
    border-radius: $radius-sm;
    background: color-mix(in srgb, var(--c-accent) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--c-accent) 22%, transparent);
  }
}

.pager {
  display: flex;
  gap: 12px;
}

.pager-link {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 2px;
  padding: 12px 14px;
  border-radius: $radius-sm;
  border: 1px solid var(--c-border);
  background: var(--c-surface);
  color: var(--c-text);
  text-decoration: none;

  &.next {
    text-align: right;
  }

  &.is-empty {
    visibility: hidden;
    pointer-events: none;
  }

  &:hover {
    color: var(--c-text);
    border-color: var(--c-accent);
  }

  .dir {
    font-size: 12px;
    color: var(--c-text-muted);
  }

  strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.missing {
  text-align: center;
  padding: 60px 20px;
  color: var(--c-text-muted);
}
</style>
