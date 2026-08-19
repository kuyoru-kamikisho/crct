<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { qibos } from '@/data/qibos'
import AppBreadcrumb from '@/components/common/AppBreadcrumb.vue'

const { t } = useI18n()
const route = useRoute()
const q = ref(typeof route.query.q === 'string' ? route.query.q : '')
const crumbs = computed(() => [
  { to: '/', label: t('nav.home') },
  { label: t('nav.qibo') },
])

watch(
  () => route.query.q,
  (value) => {
    if (typeof value === 'string') q.value = value
  },
)

function skillNames(item) {
  return (item.skills || []).map((skill) => (typeof skill === 'string' ? skill : skill?.name)).filter(Boolean)
}

const filtered = computed(() => {
  const s = q.value.trim().toLowerCase()
  if (!s) return qibos
  return qibos.filter((item) => {
    const haystack = [
      item.name,
      item.id,
      item.no != null ? `NO.${item.no}` : '',
      String(item.no ?? ''),
      ...(item.elements || []),
      item.race,
      item.stage,
      item.battleTag,
      item.intro,
      ...skillNames(item),
    ]
    return haystack.some((part) => String(part || '').toLowerCase().includes(s))
  })
})

function onPixelError(event) {
  event.target.style.display = 'none'
}

let revealRaf = 0
let revealPointer = null

function applyCardReveal() {
  revealRaf = 0
  const pointer = revealPointer
  if (!pointer) return
  const cards = pointer.grid.querySelectorAll('.card')
  for (const card of cards) {
    const rect = card.getBoundingClientRect()
    card.style.setProperty('--mx', `${pointer.x - rect.left}px`)
    card.style.setProperty('--my', `${pointer.y - rect.top}px`)
  }
}

function onGridPointerMove(event) {
  if (event.pointerType === 'touch') return
  revealPointer = { x: event.clientX, y: event.clientY, grid: event.currentTarget }
  if (!revealRaf) revealRaf = requestAnimationFrame(applyCardReveal)
}

function onGridPointerLeave() {
  revealPointer = null
  if (!revealRaf) return
  cancelAnimationFrame(revealRaf)
  revealRaf = 0
}

onUnmounted(() => {
  revealPointer = null
  if (!revealRaf) return
  cancelAnimationFrame(revealRaf)
  revealRaf = 0
})
</script>

<template>
  <div class="page">
    <AppBreadcrumb :items="crumbs" :label="t('header.breadcrumb')" />
    <header class="page-head">
      <h1>{{ t('qibo.title') }}</h1>
      <input v-model="q" type="search" class="search" :placeholder="t('common.search')" />
    </header>

    <div class="grid" @pointermove="onGridPointerMove" @pointerleave="onGridPointerLeave">
      <router-link
        v-for="item in filtered"
        :key="item.id"
        :to="{ name: 'qibo-detail', params: { id: item.id } }"
        class="card"
      >
        <div class="kibo-pixel">
          <img v-if="item.image" class="pixel" :src="item.image" :alt="item.name" width="96" height="96" loading="lazy"
            decoding="async" @error="onPixelError" />
        </div>
        <div class="no">NO.{{ item.no }}</div>
        <h2>{{ item.name }}</h2>
        <div class="tags">
          <span v-for="el in item.elements" :key="el" class="tag">{{ el }}</span>
          <span v-if="item.battleTag" class="tag muted">{{ item.battleTag }}</span>
          <span v-if="item.stage" class="tag muted">{{ item.stage }}</span>
        </div>
        <dl>
          <div v-if="item.race">
            <dt>{{ t('common.race') }}</dt>
            <dd>{{ item.race }}</dd>
          </div>
          <div v-if="item.sizeType">
            <dt>{{ t('common.sizeType') }}</dt>
            <dd>{{ item.sizeType }}</dd>
          </div>
          <div v-if="item.height">
            <dt>{{ t('common.height') }}</dt>
            <dd>{{ item.height }}</dd>
          </div>
          <div v-if="item.location">
            <dt>{{ t('common.location') }}</dt>
            <dd>{{ item.location }}</dd>
          </div>
          <div v-if="item.captureRate">
            <dt>{{ t('common.captureRate') }}</dt>
            <dd>{{ item.captureRate }}</dd>
          </div>
        </dl>
        <p>{{ item.intro }}</p>
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
  position: relative;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 180px), 1fr));
  gap: 12px;
}

.card {
  --mx: 50%;
  --my: 50%;
  isolation: isolate;
  min-width: 0;
  padding: 16px;
  position: relative;
  border-radius: $radius-md;
  border: 1px solid var(--c-border);
  background: var(--c-surface);
  color: var(--c-text);
  text-decoration: none;

  &::before,
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.22s ease;
  }

  /* 悬浮卡片内部的淡白雾 */
  &::before {
    z-index: 1;
    background: radial-gradient(
      190px circle at var(--mx) var(--my),
      rgba(255, 255, 255, 0.16),
      rgba(255, 255, 255, 0.05) 32%,
      transparent 64%
    );
  }

  /* 灯光边框：邻近卡片也会被照到 */
  &::after {
    z-index: 2;
    padding: 1px;
    background: radial-gradient(
      150px circle at var(--mx) var(--my),
      color-mix(in srgb, #fff 90%, var(--c-accent)),
      color-mix(in srgb, #fff 28%, var(--c-accent)) 28%,
      transparent 64%
    );
    mask:
      linear-gradient(#000 0 0) content-box,
      linear-gradient(#000 0 0);
    mask-composite: exclude;
    -webkit-mask:
      linear-gradient(#000 0 0) content-box,
      linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
  }

  &:hover {
    color: var(--c-text);

    .pixel {
      animation: pixelAnimation 1s steps(8) infinite;
    }
  }
}

@media (hover: hover) and (pointer: fine) {
  .grid:hover .card::after {
    opacity: 1;
  }

  .card:hover::before {
    opacity: 1;
  }
}

.kibo-pixel {
  margin-left: 10px;
  overflow: hidden;
  width: 100px;
}

.pixel {
  width: auto;
  height: 100%;
  display: block;
  max-width: unset;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  transform: translateX(0);
}

@keyframes pixelAnimation {
  0% {
    transform: translateX(0);
  }

  100% {
    transform: translateX(-100%);
  }
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

  &.muted {
    background: rgba(255, 255, 255, 0.06);
    color: var(--c-text-muted);
  }
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

.empty {
  margin: 24px 0 0;
  color: var(--c-text-muted);
}
</style>
