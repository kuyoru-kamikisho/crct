<script setup>
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '@/stores/settings'

const { t } = useI18n()
const settings = useSettingsStore()
</script>

<template>
  <label class="theme-switcher">
    <span class="sr">{{ t('header.theme') }}</span>
    <select :value="settings.theme" @change="settings.setTheme($event.target.value)">
      <option v-for="th in settings.themes" :key="th" :value="th">
        {{ t(`themes.${th}`) }}
      </option>
    </select>
  </label>
</template>

<style scoped lang="scss">
.theme-switcher select {
  height: 34px;
  padding: 0 8px;
  border-radius: $radius-sm;
  border: 1px solid var(--c-border);
  background: var(--c-surface);
  color: var(--c-text);
  cursor: pointer;
}

.sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
</style>
