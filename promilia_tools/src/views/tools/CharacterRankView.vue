<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import SvgIcon from '@jamescoyle/vue-icon'
import { mdiClose, mdiHeart, mdiHeartOutline } from '@mdi/js'
import AppBreadcrumb from '@/components/common/AppBreadcrumb.vue'
import RankBarChart from '@/components/rank/RankBarChart.vue'
import RankTrendChart from '@/components/rank/RankTrendChart.vue'
import HexagonBoard from '@/components/rank/HexagonBoard.vue'
import { characters } from '@/data/characters'
import { HEXAGON_TAB, VOTE_CATEGORIES, VOTE_MAX_SELECT } from '@/constants/vote'
import {
  VoteApiError,
  fetchHexagonStats,
  fetchVoteRank,
  fetchVoteStatus,
  fetchVoteTrend,
  submitVote,
} from '@/api/vote'
import { replaceRp } from '@/utils/replaceRp'

const { t, locale } = useI18n()

const crumbs = computed(() => [
  { to: '/', label: t('nav.home') },
  { label: t('nav.characterRank') },
])

const category = ref('favorite')
const hexagonRows = ref([])
const loadingHexagon = ref(false)
const drafts = reactive(Object.fromEntries(VOTE_CATEGORIES.map((id) => [id, []])))
const votedMap = reactive(Object.fromEntries(VOTE_CATEGORIES.map((id) => [id, false])))
const votedIdsMap = reactive(Object.fromEntries(VOTE_CATEGORIES.map((id) => [id, []])))
const rankRows = ref([])
const trendRows = ref([])
const granularity = ref('day')
const loadingBoard = ref(true)
const loadingCharts = ref(true)
const submitting = ref(false)
const confirmOpen = ref(false)
const toast = ref('')
const toastTone = ref('info')
const offline = ref(false)
let lastToggleAt = 0
let toastTimer = 0

const selected = computed(() => drafts[category.value] || [])
const voted = computed(() => Boolean(votedMap[category.value]))
const votedIds = computed(() => votedIdsMap[category.value] || [])
const isHexagon = computed(() => category.value === HEXAGON_TAB)

function displayName(character) {
  if (locale.value === 'zh-CN') return character.name
  return character.nameEn || character.name
}

const roster = computed(() =>
  characters.map((c) => ({
    id: c.id,
    name: displayName(c),
    nameZh: c.name,
    nameEn: c.nameEn,
    icon: `/imgs/characters/${c.id}.png`,
  })),
)

const ranking = computed(() => {
  const totals = Object.fromEntries(rankRows.value.map((row) => [row.id, row.total]))
  const seen = new Set()
  const list = roster.value.map((c) => {
    seen.add(c.id)
    return { id: c.id, name: c.name, total: totals[c.id] || 0 }
  })
  for (const row of rankRows.value) {
    if (!seen.has(row.id)) list.push({ id: row.id, name: row.id, total: row.total })
  }
  list.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'zh-CN'))
  return list
})

const trendSeries = computed(() => {
  const names = Object.fromEntries(roster.value.map((c) => [c.id, c.name]))
  return trendRows.value.map((row) => ({
    id: row.id,
    name: names[row.id] || row.id,
    points: row.points || [],
  }))
})

const confirmList = computed(() =>
  selected.value
    .map((id) => roster.value.find((c) => c.id === id))
    .filter(Boolean),
)

const hexagonItems = computed(() => {
  const byId = Object.fromEntries(roster.value.map((c) => [c.id, c]))
  const rows = hexagonRows.value.length
    ? hexagonRows.value
    : roster.value.map((c) => ({
        id: c.id,
        scores: Object.fromEntries(VOTE_CATEGORIES.map((key) => [key, 0])),
        total: 0,
      }))
  return rows.map((row, index) => {
    const meta = byId[row.id] || {
      id: row.id,
      name: row.id,
      nameZh: row.id,
      nameEn: row.id,
      icon: `/imgs/characters/${row.id}.png`,
    }
    return {
      ...meta,
      scores: row.scores || {},
      total: Number(row.total) || 0,
      place: index + 1,
    }
  })
})

const hexagonMax = computed(() => {
  let max = 1
  for (const item of hexagonItems.value) {
    for (const key of VOTE_CATEGORIES) {
      max = Math.max(max, Number(item.scores?.[key]) || 0)
    }
  }
  return max
})

function showToast(message, tone = 'info') {
  toast.value = message
  toastTone.value = tone
  clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toast.value = ''
  }, 3200)
}

function errorText(err) {
  if (err instanceof VoteApiError) {
    const key = `rank.errors.${err.code}`
    const translated = t(key)
    if (translated && translated !== key) return translated
  }
  return t('rank.voteFail')
}

function onPortraitError(event) {
  event.target.style.display = 'none'
}

function isHeartOn(id) {
  if (voted.value) return votedIds.value.includes(id)
  return selected.value.includes(id)
}

function toggleSelect(id) {
  if (voted.value || submitting.value) return
  const now = Date.now()
  if (now - lastToggleAt < 180) return
  lastToggleAt = now
  const current = drafts[category.value]
  const index = current.indexOf(id)
  if (index >= 0) {
    drafts[category.value] = current.filter((item) => item !== id)
    return
  }
  if (current.length >= VOTE_MAX_SELECT) {
    showToast(t('rank.tooMany'), 'warn')
    return
  }
  drafts[category.value] = [...current, id]
}

function openConfirm() {
  if (voted.value) {
    showToast(t('rank.alreadyVoted'), 'warn')
    return
  }
  if (!selected.value.length) {
    showToast(t('rank.emptySelect'), 'warn')
    return
  }
  confirmOpen.value = true
}

function closeConfirm() {
  if (submitting.value) return
  confirmOpen.value = false
}

async function loadStatus() {
  const data = await fetchVoteStatus(category.value)
  votedMap[category.value] = Boolean(data.voted)
  votedIdsMap[category.value] = data.character_ids || []
  if (data.voted) drafts[category.value] = [...(data.character_ids || [])]
}

async function loadCharts() {
  const [rank, trend] = await Promise.all([
    fetchVoteRank(category.value),
    fetchVoteTrend(category.value, granularity.value),
  ])
  rankRows.value = rank.ranking || []
  trendRows.value = trend.series || []
}

async function loadHexagon() {
  loadingHexagon.value = true
  try {
    const data = await fetchHexagonStats()
    hexagonRows.value = data.characters || []
    offline.value = false
  } catch (err) {
    offline.value = err instanceof VoteApiError && err.code === 'OFFLINE'
    if (!offline.value) showToast(errorText(err), 'warn')
  } finally {
    loadingHexagon.value = false
  }
}

async function refreshAll() {
  if (isHexagon.value) {
    await loadHexagon()
    return
  }
  loadingBoard.value = true
  loadingCharts.value = true
  try {
    await Promise.all([loadStatus(), loadCharts()])
    offline.value = false
  } catch (err) {
    offline.value = err instanceof VoteApiError && err.code === 'OFFLINE'
    if (!offline.value) showToast(errorText(err), 'warn')
  } finally {
    loadingBoard.value = false
    loadingCharts.value = false
  }
}

async function confirmVote() {
  if (submitting.value || voted.value) return
  submitting.value = true
  try {
    await submitVote(category.value, selected.value)
    confirmOpen.value = false
    votedMap[category.value] = true
    votedIdsMap[category.value] = [...selected.value]
    showToast(t('rank.voteSuccess'), 'ok')
    loadingCharts.value = true
    await loadCharts()
  } catch (err) {
    showToast(errorText(err), 'warn')
    if (err instanceof VoteApiError && (err.code === 'ALREADY_VOTED' || err.code === 'DEVICE_ALREADY_VOTED')) {
      votedMap[category.value] = true
      confirmOpen.value = false
      await loadStatus()
    }
  } finally {
    submitting.value = false
    loadingCharts.value = false
  }
}

function onKeydown(event) {
  if (event.key === 'Escape') closeConfirm()
}

watch(category, () => {
  refreshAll()
})

watch(granularity, async () => {
  if (isHexagon.value) return
  loadingCharts.value = true
  try {
    const trend = await fetchVoteTrend(category.value, granularity.value)
    trendRows.value = trend.series || []
    offline.value = false
  } catch (err) {
    offline.value = err instanceof VoteApiError && err.code === 'OFFLINE'
  } finally {
    loadingCharts.value = false
  }
})

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  refreshAll()
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  clearTimeout(toastTimer)
})
</script>

<template>
  <div class="page" :class="{ 'hex-mode': isHexagon }">
    <AppBreadcrumb :items="crumbs" :label="t('header.breadcrumb')" />

    <header class="page-head">
      <div>
        <h1>{{ t('rank.title') }}</h1>
        <p class="hint">{{ isHexagon ? t('rank.hexagonHint') : t('rank.hint') }}</p>
      </div>
    </header>

    <section v-if="!isHexagon" class="rules" :aria-label="t('rank.rulesTitle')">
      <h2>{{ t('rank.rulesTitle') }}</h2>
      <ul>
        <li>{{ t('rank.ruleDaily') }}</li>
        <li>{{ t('rank.ruleIndependent') }}</li>
      </ul>
    </section>

    <div class="tabs" role="tablist">
      <button
        v-for="id in VOTE_CATEGORIES"
        :key="id"
        type="button"
        class="tab"
        role="tab"
        :aria-selected="category === id"
        :class="{ on: category === id }"
        @click="category = id"
      >
        {{ t(`rank.categories.${id}`) }}
      </button>
      <button
        type="button"
        class="tab"
        role="tab"
        :aria-selected="isHexagon"
        :class="{ on: isHexagon }"
        @click="category = HEXAGON_TAB"
      >
        {{ t('rank.hexagonTab') }}
      </button>
    </div>

    <p v-if="offline" class="banner warn">{{ t('rank.offline') }}</p>
    <p v-else-if="!isHexagon && voted" class="banner ok">{{ t('rank.voted') }}</p>
    <p v-if="toast" class="banner" :class="toastTone">{{ toast }}</p>

    <HexagonBoard
      v-if="isHexagon"
      :items="hexagonItems"
      :max-score="hexagonMax"
      :loading="loadingHexagon"
      :hint="t('rank.hexagonLead')"
      :loading-text="t('rank.loading')"
      :empty-text="t('rank.noVotes')"
    />

    <template v-else>
    <section class="board">
      <div class="grid">
        <article v-for="c in roster" :key="c.id" class="card" :class="{ picked: isHeartOn(c.id) }" @click="toggleSelect(c.id)">
          <div class="avatar">
            <span class="fallback">{{ c.nameZh.slice(0, 1) }}</span>
            <img
              :src="c.icon"
              :alt="c.name"
              width="56"
              height="56"
              loading="lazy"
              decoding="async"
              @error="onPortraitError"
            />
          </div>
          <div class="meta">
            <h3>{{ c.nameZh }}</h3>
            <p>{{ c.nameEn }}</p>
          </div>
          <button
            type="button"
            class="heart"
            :class="{ on: isHeartOn(c.id) }"
            :disabled="voted"
            :aria-pressed="isHeartOn(c.id)"
            :aria-label="c.name"
          >
            <svg-icon type="mdi" :size="22" :path="isHeartOn(c.id) ? mdiHeart : mdiHeartOutline" />
          </button>
        </article>
      </div>
      <p class="vote-hint">{{ t('rank.hint') }}</p>
    </section>

    <div class="actions">
      <p>{{ replaceRp(t('rank.selected'), selected.length, VOTE_MAX_SELECT) }}</p>
      <button type="button" class="confirm" :disabled="voted || submitting" @click="openConfirm">
        {{ t('rank.confirm') }}
      </button>
    </div>

    <div class="charts">
      <RankBarChart :items="ranking" :loading="loadingCharts || loadingBoard" />
      <RankTrendChart
        v-model:granularity="granularity"
        :series="trendSeries"
        :ranking="ranking"
        :loading="loadingCharts"
      />
    </div>
    </template>

    <Teleport to="body">
      <div v-if="confirmOpen" class="overlay" @click.self="closeConfirm">
        <div class="dialog" role="dialog" aria-modal="true" :aria-label="t('rank.confirmTitle')">
          <header>
            <h2>{{ t('rank.confirmTitle') }}</h2>
            <button type="button" class="close" :aria-label="t('rank.confirmCancel')" @click="closeConfirm">
              <svg-icon type="mdi" :size="18" :path="mdiClose" />
            </button>
          </header>
          <p>{{ t('rank.confirmBody') }}</p>
          <ul>
            <li v-for="c in confirmList" :key="c.id">
              <img :src="c.icon" :alt="c.name" width="28" height="28" @error="onPortraitError" />
              <span>{{ c.nameZh }}</span>
            </li>
          </ul>
          <div class="dialog-actions">
            <button type="button" class="ghost" :disabled="submitting" @click="closeConfirm">
              {{ t('rank.confirmCancel') }}
            </button>
            <button type="button" class="confirm" :disabled="submitting" @click="confirmVote">
              {{ t('rank.confirmOk') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
.page {
  min-width: 0;
  padding-bottom: 88px;

  &.hex-mode {
    padding-bottom: 16px;
  }
}

.page-head {
  margin-bottom: 16px;

  h1 {
    margin: 0 0 4px;
    font-size: clamp(18px, 5vw, 22px);
  }
}

.hint,
.vote-hint {
  margin: 0;
  color: var(--c-text-muted);
  font-size: 13px;
}

.vote-hint {
  margin-top: 14px;
  text-align: center;
}

.rules {
  margin-bottom: 18px;
  padding: 14px 16px;
  border-radius: $radius-md;
  border: 1px solid var(--c-border);
  background: var(--c-surface);

  h2 {
    margin: 0 0 8px;
    font-size: 14px;
  }

  ul {
    margin: 0;
    padding-left: 18px;
    color: var(--c-text-muted);
    font-size: 12px;
    line-height: 1.7;
  }
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.tab {
  height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid var(--c-border);
  background: var(--c-surface);
  color: var(--c-text-muted);
  cursor: pointer;
  font-size: 13px;

  &.on {
    color: var(--c-accent);
    border-color: color-mix(in srgb, var(--c-accent) 60%, var(--c-border));
    background: color-mix(in srgb, var(--c-accent) 14%, var(--c-surface));
  }
}

.banner {
  margin: 0 0 14px;
  padding: 8px 12px;
  border-radius: $radius-sm;
  font-size: 13px;
  border: 1px solid var(--c-border);
  background: var(--c-surface);

  &.ok {
    color: var(--c-accent-soft);
    border-color: color-mix(in srgb, var(--c-accent) 45%, var(--c-border));
  }

  &.warn {
    color: var(--c-star);
  }
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
  gap: 10px;
}

.card {
  display: grid;
  grid-template-columns: 56px 1fr 40px;
  gap: 10px;
  align-items: center;
  padding: 10px;
  border-radius: $radius-md;
  border: 1px solid var(--c-border);
  background: var(--c-surface);
  transition:
    border-color 0.18s,
    box-shadow 0.18s;

  &.picked {
    border-color: color-mix(in srgb, #f07090 55%, var(--c-border));
    box-shadow: 0 0 16px rgba(240, 112, 144, 0.12);
  }
}

.avatar {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--c-bg-elevated);
  border: 1px solid var(--c-border);

  .fallback {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-size: 16px;
    color: var(--c-accent-soft);
  }

  img {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: 50% 12%;
  }
}

.meta {
  min-width: 0;

  h3 {
    margin: 0;
    font-size: 14px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  p {
    margin: 2px 0 0;
    font-size: 11px;
    color: var(--c-text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.heart {
  width: 40px;
  height: 40px;
  border: 0;
  background: transparent;
  color: var(--c-text-muted);
  cursor: pointer;
  display: grid;
  place-items: center;
  transition:
    color 0.16s,
    transform 0.16s;

  :deep(svg) {
    fill: currentColor;
  }

  &:hover:not(:disabled) {
    color: #f07090;
    transform: scale(1.08);
  }

  &.on {
    color: #f07090;
  }

  &:disabled {
    cursor: default;
    opacity: 0.85;
  }
}

.actions {
  position: sticky;
  bottom: 12px;
  z-index: 5;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin: 16px 0 20px;
  padding: 10px 14px;
  border-radius: $radius-md;
  border: 1px solid var(--c-border);
  background: color-mix(in srgb, var(--c-bg-elevated) 88%, transparent);
  backdrop-filter: blur(10px);

  p {
    margin: 0;
    font-size: 13px;
    color: var(--c-text-muted);
  }
}

.confirm,
.ghost {
  height: 36px;
  padding: 0 16px;
  border-radius: $radius-sm;
  cursor: pointer;
  font-size: 13px;
}

.confirm {
  border: 0;
  background: var(--c-accent);
  color: var(--c-bg);
  font-weight: 700;

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
}

.ghost {
  border: 1px solid var(--c-border);
  background: transparent;
  color: var(--c-text);
}

.charts {
  display: grid;
  gap: 16px;
}

.overlay {
  position: fixed;
  inset: 0;
  z-index: $z-float;
  background: rgba(0, 0, 0, 0.48);
  display: grid;
  place-items: center;
  padding: 16px;
}

.dialog {
  width: min(440px, 100%);
  border-radius: $radius-md;
  border: 1px solid var(--c-border);
  background: var(--c-bg-elevated);
  padding: 16px 18px 18px;

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  h2 {
    margin: 0;
    font-size: 16px;
  }

  p {
    margin: 0 0 12px;
    color: var(--c-text-muted);
    font-size: 13px;
  }

  ul {
    margin: 0 0 16px;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 8px;
  }

  li {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;

    img {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      object-fit: cover;
      object-position: 50% 12%;
    }
  }
}

.close {
  width: 32px;
  height: 32px;
  border: 0;
  background: transparent;
  color: var(--c-text-muted);
  cursor: pointer;
  display: grid;
  place-items: center;

  :deep(svg) {
    fill: currentColor;
  }
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
