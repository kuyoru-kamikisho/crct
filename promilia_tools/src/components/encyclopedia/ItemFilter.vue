<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SvgIcon from '@jamescoyle/vue-icon'
import { mdiEraserVariant, mdiStar } from '@mdi/js'
import { replaceRp } from '@/utils/replaceRp'

const filters = defineModel({ type: Object, required: true })
const props = defineProps({
  options: {
    type: Object,
    required: true,
  },
})

const { t } = useI18n()

const groups = computed(() => [
  { key: 'rarity', label: t('common.rarity'), kind: 'rarity', items: props.options.rarity || [] },
  { key: 'types', label: t('item.types'), kind: 'chips', items: props.options.types || [] },
  { key: 'ways', label: t('item.ways'), kind: 'chips', items: props.options.ways || [] },
])

const hasSelection = computed(() =>
  Object.values(filters.value).some((list) => list?.length),
)

function isOn(key, value) {
  return filters.value[key]?.includes(value)
}

function toggle(key, value) {
  const current = filters.value[key] ?? []
  const next = current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value]
  filters.value = { ...filters.value, [key]: next }
}

function clearAll() {
  filters.value = {
    rarity: [],
    types: [],
    tags: [],
    ways: [],
  }
}

function rarityLabel(value) {
  return replaceRp(t('item.filterRarity'), value)
}
</script>

<template>
  <section class="filter-panel" :aria-label="t('common.filter')">
    <header class="filter-head">
      <h3>{{ t('common.filter') }}</h3>
      <button
        type="button"
        class="clear-btn"
        :disabled="!hasSelection"
        @click="clearAll"
      >
        <svg-icon type="mdi" :size="16" :path="mdiEraserVariant" />
        {{ t('common.clearFilter') }}
      </button>
    </header>

    <div v-for="group in groups" v-show="group.items.length" :key="group.key" class="group">
      <p class="group-label">{{ group.label }}</p>
      <div class="chip-row">
        <button
          v-for="item in group.items"
          :key="String(item)"
          type="button"
          class="chip"
          :class="{ on: isOn(group.key, item), star: group.kind === 'rarity' }"
          :aria-pressed="isOn(group.key, item)"
          @click="toggle(group.key, item)"
        >
          <svg-icon
            v-if="group.kind === 'rarity'"
            type="mdi"
            :size="14"
            :path="mdiStar"
          />
          {{ group.kind === 'rarity' ? rarityLabel(item) : item }}
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.filter-panel {
  margin-bottom: 20px;
  padding: 14px 18px 10px;
  border-radius: $radius-lg;
  border: 1px solid var(--c-border);
  background: var(--c-surface);
  box-shadow: var(--shadow-glow);
  min-width: 0;

  @media (max-width: 479px) {
    padding: 12px 12px 8px;
  }
}

.filter-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;

  h3 {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.08em;
    color: var(--c-accent-soft);
  }
}

.clear-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: var(--c-text-muted);
  font-size: 12px;
  cursor: pointer;
  transition:
    color 0.18s,
    border-color 0.18s,
    background 0.18s;

  :deep(svg) {
    fill: currentColor;
  }

  &:hover:not(:disabled) {
    color: var(--c-text);
    border-color: var(--c-border);
    background: rgba(255, 255, 255, 0.04);
  }

  &:disabled {
    opacity: 0.35;
    cursor: default;
  }
}

.group {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 8px 12px;
  padding: 10px 0;
  border-top: 1px solid color-mix(in srgb, var(--c-border) 70%, transparent);

  &:first-of-type {
    border-top: 0;
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 6px;
  }
}

.group-label {
  margin: 0;
  padding-top: 6px;
  font-size: 12px;
  color: var(--c-text-muted);
  letter-spacing: 0.04em;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--c-border);
  background: rgba(255, 255, 255, 0.04);
  color: var(--c-text-muted);
  font-size: 12px;
  cursor: pointer;
  transition:
    color 0.18s,
    border-color 0.18s,
    background 0.18s,
    box-shadow 0.18s,
    transform 0.18s;

  :deep(svg) {
    fill: currentColor;
  }

  &:hover {
    color: var(--c-text);
    border-color: color-mix(in srgb, var(--c-accent) 45%, var(--c-border));
    transform: translateY(-1px);
  }

  &.on {
    color: var(--c-accent-soft);
    border-color: color-mix(in srgb, var(--c-accent) 65%, transparent);
    background: color-mix(in srgb, var(--c-accent) 16%, transparent);
    box-shadow: 0 0 12px color-mix(in srgb, var(--c-accent) 18%, transparent);
  }

  &.star.on {
    color: var(--c-star);
    border-color: color-mix(in srgb, var(--c-star) 55%, transparent);
    background: color-mix(in srgb, var(--c-star) 14%, transparent);
    box-shadow: 0 0 12px color-mix(in srgb, var(--c-star) 16%, transparent);
  }
}
</style>
