<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import SvgIcon from '@jamescoyle/vue-icon'
import {
  mdiAccountStar,
  mdiBagPersonal,
  mdiBookOpenPageVariant,
  mdiClose,
  mdiLightningBolt,
  mdiMagnify,
  mdiPaw,
} from '@mdi/js'
import { useSettingsStore } from '@/stores/settings'
import { searchSite, splitHighlight } from '@/utils/siteSearch'
import { replaceRp } from '@/utils/replaceRp'

const KIND_ICONS = {
  character: mdiAccountStar,
  skill: mdiLightningBolt,
  qibo: mdiPaw,
  item: mdiBagPersonal,
  page: mdiBookOpenPageVariant,
}

const { t } = useI18n()
const router = useRouter()
const settings = useSettingsStore()

const root = ref(null)
const inputEl = ref(null)
const query = ref('')
const results = ref([])
const expanded = ref(false)
const focused = ref(false)
const composing = ref(false)
const activeIndex = ref(0)

const isNarrow = computed(() => settings.isNarrow)
const panelOpen = computed(() => !isNarrow.value || expanded.value)
const dropdownOpen = computed(() => {
  if (!query.value.trim() || !panelOpen.value) return false
  return isNarrow.value ? expanded.value : focused.value
})

const KIND_LABEL_KEYS = {
  character: 'search.character',
  skill: 'search.skill',
  qibo: 'search.qibo',
  item: 'search.item',
  page: 'search.page',
}

function displayTitle(item) {
  return item.labelKey ? t(item.labelKey) : item.title
}

function displaySubtitle(item) {
  if (item.kind === 'skill' && item.owner) {
    return [item.owner, item.subtitle].filter(Boolean).join(' · ')
  }
  return item.subtitle
}

function clearQuery() {
  query.value = ''
  results.value = []
}

function clearOrClose() {
  if (query.value) clearQuery()
  else closeSearch({ clear: true })
}

function onCompositionEnd() {
  composing.value = false
  runSearch()
}

function runSearch() {
  results.value = searchSite(query.value)
  activeIndex.value = 0
}

watch(query, () => {
  if (!composing.value) runSearch()
})

watch(isNarrow, (narrow) => {
  if (!narrow) expanded.value = false
})

async function openSearch() {
  expanded.value = true
  focused.value = true
  await nextTick()
  inputEl.value?.focus()
}

function closeSearch({ clear = false } = {}) {
  expanded.value = false
  focused.value = false
  inputEl.value?.blur()
  if (clear) {
    query.value = ''
    results.value = []
  }
}

function select(item) {
  if (!item) return
  closeSearch({ clear: true })
  router.push(item.to)
}

function moveActive(delta) {
  if (!results.value.length) return
  const len = results.value.length
  activeIndex.value = (activeIndex.value + delta + len) % len
}

function onInputKeydown(event) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    moveActive(1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    moveActive(-1)
  } else if (event.key === 'Enter') {
    event.preventDefault()
    select(results.value[activeIndex.value])
  } else if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    if (query.value) {
      query.value = ''
      results.value = []
    } else {
      closeSearch()
    }
  }
}

function isTypingTarget(el) {
  if (!el || !(el instanceof Element)) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

function onGlobalKey(event) {
  const shortcutK = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k'
  const slash = event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey
  if (shortcutK || slash) {
    if (slash && isTypingTarget(event.target)) return
    event.preventDefault()
    openSearch()
    return
  }
  if (event.key === 'Escape' && expanded.value) {
    event.stopPropagation()
    closeSearch()
  }
}

function onPointerDown(event) {
  if (!root.value?.contains(event.target)) {
    closeSearch()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKey)
  document.addEventListener('pointerdown', onPointerDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKey)
  document.removeEventListener('pointerdown', onPointerDown)
})
</script>

<template>
  <div
    ref="root"
    class="site-search"
    :class="{ 'is-narrow': isNarrow, 'is-expanded': expanded }"
  >
    <button
      v-if="isNarrow && !expanded"
      type="button"
      class="icon-btn"
      :title="t('header.openSearch')"
      :aria-label="t('header.openSearch')"
      @click="openSearch"
    >
      <svg-icon type="mdi" :size="18" :path="mdiMagnify" />
    </button>

    <div
      v-if="isNarrow && expanded"
      class="search-backdrop"
      @pointerdown.prevent.stop="closeSearch({ clear: true })"
    />

    <div v-show="panelOpen" class="search-panel">
      <div class="search-field">
        <svg-icon class="field-icon" type="mdi" :size="18" :path="mdiMagnify" />
        <input
          ref="inputEl"
          v-model="query"
          type="search"
          class="search-input"
          :placeholder="t('header.searchPlaceholder')"
          :aria-label="t('common.search')"
          aria-autocomplete="list"
          aria-controls="site-search-list"
          :aria-expanded="dropdownOpen"
          :aria-activedescendant="dropdownOpen ? `site-search-opt-${activeIndex}` : undefined"
          autocomplete="off"
          autocorrect="off"
          spellcheck="false"
          role="combobox"
          @focus="focused = true"
          @blur="focused = false"
          @keydown="onInputKeydown"
          @compositionstart="composing = true"
          @compositionend="onCompositionEnd"
        />
        <button
          v-if="query || (isNarrow && expanded)"
          type="button"
          class="clear-btn"
          :title="query ? t('header.clearSearch') : t('header.closeSearch')"
          :aria-label="query ? t('header.clearSearch') : t('header.closeSearch')"
          @click="clearOrClose"
        >
          <svg-icon type="mdi" :size="16" :path="mdiClose" />
        </button>
      </div>

      <p v-if="isNarrow && expanded && !query.trim()" class="hint">
        {{ t('header.searchHint') }}
      </p>

      <ul v-if="dropdownOpen" id="site-search-list" class="results" role="listbox">
        <li v-if="!results.length" class="empty" role="presentation">
          {{ replaceRp(t('header.searchNoResult'), query.trim()) }}
        </li>
        <li
          v-for="(item, i) in results"
          :id="`site-search-opt-${i}`"
          :key="item.id"
          role="option"
          class="result"
          :class="{ active: i === activeIndex }"
          :aria-selected="i === activeIndex"
          @mouseenter="activeIndex = i"
          @mousedown.prevent="select(item)"
        >
          <svg-icon class="kind-icon" type="mdi" :size="18" :path="KIND_ICONS[item.kind] || KIND_ICONS.page" />
          <div class="result-body">
            <div class="result-head">
              <strong>
                <span
                  v-for="(part, pi) in splitHighlight(displayTitle(item), query)"
                  :key="`${item.id}-t-${pi}`"
                  :class="{ hit: part.hit }"
                  >{{ part.text }}</span
                >
              </strong>
              <span class="kind">{{ t(KIND_LABEL_KEYS[item.kind] || 'search.page') }}</span>
            </div>
            <p v-if="displaySubtitle(item)" class="sub">
              <span
                v-for="(part, pi) in splitHighlight(displaySubtitle(item), query)"
                :key="`${item.id}-s-${pi}`"
                :class="{ hit: part.hit }"
                >{{ part.text }}</span
              >
            </p>
            <p
              v-if="item.snippet && item.snippet !== displaySubtitle(item)"
              class="snippet"
            >
              <span
                v-for="(part, pi) in splitHighlight(item.snippet, query)"
                :key="`${item.id}-x-${pi}`"
                :class="{ hit: part.hit }"
                >{{ part.text }}</span
              >
            </p>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped lang="scss">
.site-search {
  position: relative;
  width: 100%;
  min-width: 0;
}

.icon-btn {
  width: 36px;
  height: 36px;
  border: 1px solid var(--c-border);
  border-radius: $radius-sm;
  background: var(--c-surface);
  color: var(--c-text);
  display: grid;
  place-items: center;
  cursor: pointer;
  transition:
    border-color 0.2s,
    background 0.2s;

  &:hover {
    border-color: var(--c-accent);
    background: rgba(62, 207, 207, 0.1);
  }

  :deep(svg) {
    fill: currentColor;
  }
}

.search-panel {
  width: 100%;
  min-width: 0;
}

.search-field {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 6px 0 10px;
  border: 1px solid var(--c-border);
  border-radius: $radius-sm;
  background: var(--c-surface);
  transition: border-color 0.2s;

  &:focus-within {
    border-color: var(--c-accent);
  }
}

.field-icon {
  flex-shrink: 0;
  color: var(--c-text-muted);

  :deep(svg) {
    fill: currentColor;
  }
}

.search-input {
  flex: 1;
  min-width: 0;
  height: 100%;
  border: none;
  background: transparent;
  color: var(--c-text);
  outline: none;

  &::-webkit-search-cancel-button {
    display: none;
  }
}

.clear-btn {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--c-text-muted);
  display: grid;
  place-items: center;
  cursor: pointer;

  &:hover {
    color: var(--c-text);
    background: rgba(255, 255, 255, 0.06);
  }

  :deep(svg) {
    fill: currentColor;
  }
}

.hint,
.empty {
  margin: 8px 4px 4px;
  font-size: 12px;
  color: var(--c-text-muted);
}

.results {
  list-style: none;
  margin: 6px 0 0;
  padding: 6px;
  max-height: min(60vh, 420px);
  overflow: auto;
  border-radius: $radius-md;
  background: var(--c-bg-elevated);
  border: 1px solid var(--c-border);
  box-shadow: var(--shadow-glow);
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 3;
  width: max(100%, min(420px, calc(100vw - 24px)));
}

.result {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 8px 10px;
  border-radius: $radius-sm;
  cursor: pointer;

  &.active {
    background: rgba(62, 207, 207, 0.12);
  }
}

.kind-icon {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--c-accent-soft);

  :deep(svg) {
    fill: currentColor;
  }
}

.result-body {
  min-width: 0;
  flex: 1;
}

.result-head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;

  strong {
    font-size: 13px;
    font-weight: 650;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.kind {
  flex-shrink: 0;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(62, 207, 207, 0.12);
  color: var(--c-accent-soft);
}

.sub,
.snippet {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--c-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hit {
  color: var(--c-star);
  font-weight: 650;
}

.empty {
  padding: 12px 8px;
  text-align: center;
}

.search-backdrop {
  position: fixed;
  inset: 0;
  z-index: calc(#{$z-float} - 1);
  background: rgba(0, 0, 0, 0.48);
}

.site-search.is-expanded {
  .search-panel {
    position: fixed;
    left: 10px;
    right: 10px;
    top: calc(env(safe-area-inset-top, 0px) + 8px);
    z-index: $z-float;
    display: flex;
    flex-direction: column;
    max-height: min(80vh, 560px);
    padding: 8px;
    border-radius: $radius-md;
    background: var(--c-bg-elevated);
    border: 1px solid var(--c-border);
    box-shadow: var(--shadow-glow);
  }

  .results {
    position: static;
    width: 100%;
    flex: 1;
    margin-top: 8px;
    border: none;
    box-shadow: none;
    background: transparent;
    padding: 0;
  }

  .hint {
    margin: 8px 6px 0;
  }
}
</style>
