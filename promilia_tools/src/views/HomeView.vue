<script setup>
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useCatalogStore } from '@/stores/catalog'

const { t } = useI18n()
const catalog = useCatalogStore()
const { characterSummaries, qiboSummaries, featuredItemNames, encyclopediaStats, itemSourceCatalog, loading, error } =
  storeToRefs(catalog)

onMounted(() => {
  catalog.ensureNav().catch(() => {})
})

const sourceEntries = computed(() => (itemSourceCatalog.value || []).filter((src) => src.kind === 'source').slice(0, 8))

const entries = computed(() => [
  {
    to: '/encyclopedia/characters',
    label: t('nav.characters'),
    desc: characterSummaries.value.slice(0, 3).map((c) => c.name).join('、'),
  },
  {
    to: '/encyclopedia/qibo',
    label: t('nav.qibo'),
    desc: qiboSummaries.value.slice(0, 3).map((q) => q.name).join('、'),
  },
  {
    to: '/encyclopedia/items',
    label: t('nav.items'),
    desc: featuredItemNames.value.join('、'),
  },
  ...sourceEntries.value.slice(0, 3).map((src) => ({ to: src.path, label: src.name, desc: `${src.count}` })),
  { to: '/contribute', label: t('nav.contribute'), desc: '' },
])

const featuredCharacters = computed(() => characterSummaries.value.slice(0, 8))
const featuredQibos = computed(() => qiboSummaries.value.slice(0, 8))
const catalogSources = computed(() => itemSourceCatalog.value || [])
</script>

<template>
  <div class="home">
    <section class="hero">
      <p class="eyebrow">{{ t('app.tagline') }}</p>
      <h1>{{ t('app.name') }}</h1>
      <p class="lead">{{ t('home.welcome') }}</p>
      <p class="intro">{{ t('home.intro') }}</p>
      <p class="notice">{{ t('home.notice') }}</p>
    </section>

    <p v-if="loading.nav" class="catalog-lead">{{ t('common.catalogLoading') }}</p>
    <p v-else-if="error.nav" class="catalog-lead">{{ t('common.catalogError') }}</p>

    <section class="stats" :aria-label="t('home.quickStats')">
      <h2>{{ t('home.quickStats') }}</h2>
      <div class="stat-grid">
        <div class="stat">
          <strong>{{ encyclopediaStats.characters }}</strong>
          <span>{{ t('home.characterCount') }}</span>
        </div>
        <div class="stat">
          <strong>{{ encyclopediaStats.qibos }}</strong>
          <span>{{ t('home.qiboCount') }}</span>
        </div>
        <div class="stat">
          <strong>{{ encyclopediaStats.items }}</strong>
          <span>{{ t('home.itemCount') }}</span>
        </div>
      </div>
    </section>

    <section class="modules">
      <h2>{{ t('home.modules') }}</h2>
      <div class="module-grid">
        <router-link v-for="e in entries" :key="e.to" :to="e.to" class="module-card">
          <h3>{{ e.label }}</h3>
          <p v-if="e.desc">{{ e.desc }}</p>
        </router-link>
      </div>
    </section>

    <section class="catalog" aria-labelledby="catalog-title">
      <h2 id="catalog-title">{{ t('home.catalog') }}</h2>
      <p class="catalog-lead">{{ t('home.catalogLead') }}</p>
      <h3>{{ t('nav.characters') }}</h3>
      <ul class="name-list">
        <li v-for="c in featuredCharacters" :key="c.id">
          <router-link :to="`/encyclopedia/characters/${c.id}`">{{ c.name }}</router-link>
        </li>
        <li>
          <router-link class="view-all" to="/encyclopedia/characters">{{ t('home.viewAll') }}</router-link>
        </li>
      </ul>
      <h3>{{ t('nav.qibo') }}</h3>
      <ul class="name-list">
        <li v-for="qibo in featuredQibos" :key="qibo.id">
          <router-link :to="{ name: 'qibo-detail', params: { id: qibo.id } }">{{ qibo.name }}</router-link>
        </li>
        <li>
          <router-link class="view-all" :to="{ name: 'qibo' }">{{ t('home.viewAll') }}</router-link>
        </li>
      </ul>
      <h3>{{ t('nav.items') }}</h3>
      <ul class="name-list">
        <li v-for="src in catalogSources" :key="src.id">
          <router-link :to="src.path">{{ src.name }}（{{ src.count }}）</router-link>
        </li>
      </ul>
    </section>
  </div>
</template>


<style scoped lang="scss">
.home {
  max-width: 1080px;
  min-width: 0;
}

.hero {
  padding: 28px 0 12px;
  animation: rise 0.55s ease both;

  @media (max-width: 719px) {
    padding: 12px 0 8px;
  }
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--c-star);
  letter-spacing: 0.12em;
  font-size: 12px;
  text-transform: uppercase;
}

h1 {
  margin: 0 0 12px;
  font-size: clamp(22px, 7vw, 42px);
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1.25;
  background: linear-gradient(120deg, var(--c-text), var(--c-accent-soft) 55%, var(--c-star));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.lead {
  margin: 0 0 10px;
  font-size: 16px;
  color: var(--c-accent-soft);
}

.intro {
  margin: 0 0 12px;
  color: var(--c-text-muted);
  line-height: 1.7;
}

.notice {
  margin: 0;
  font-size: 12px;
  color: var(--c-text-muted);
}

.stats,
.modules,
.catalog {
  margin: 28px 0;
}

h2 {
  margin: 0 0 14px;
  font-size: 15px;
  color: var(--c-accent-soft);
}

.stat-grid,
.module-grid {
  display: grid;
  gap: 12px;
}

.stat-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));

  @media (max-width: 560px) {
    grid-template-columns: minmax(0, 1fr);
  }
}

.stat {
  padding: 16px;
  border-radius: $radius-md;
  border: 1px solid var(--c-border);
  background: var(--c-surface);

  strong {
    display: block;
    font-size: 22px;
    color: var(--c-star);
  }

  span {
    font-size: 12px;
    color: var(--c-text-muted);
  }
}

.module-grid {
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 180px), 1fr));
}

.module-card {
  padding: 16px;
  border-radius: $radius-md;
  border: 1px solid var(--c-border);
  background: var(--c-surface);
  color: var(--c-text);
  text-decoration: none;
  min-width: 0;

  h3 {
    margin: 0 0 6px;
    font-size: 15px;
  }

  p {
    margin: 0;
    font-size: 12px;
    color: var(--c-text-muted);
  }

  &:hover {
    border-color: var(--c-accent);
    color: var(--c-text);
  }
}

.catalog-lead {
  margin: 0 0 16px;
  color: var(--c-text-muted);
  font-size: 13px;
}

.catalog h3 {
  margin: 16px 0 8px;
  font-size: 13px;
  color: var(--c-text);
}

.name-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 13px;

  a {
    color: var(--c-accent-soft);

    &:hover {
      color: var(--c-accent);
    }
  }

  .view-all {
    font-weight: 650;
  }
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
</style>
