<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

function backTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function refresh() {
  location.reload()
}
</script>

<template>
  <div class="float-actions" role="complementary">
    <button type="button" :title="t('common.backTop')" @click="backTop">↑</button>
    <button type="button" :title="t('common.refresh')" @click="refresh">↻</button>
  </div>
</template>

<style scoped lang="scss">
.float-actions {
  position: fixed;
  right: max(12px, env(safe-area-inset-right, 0px));
  bottom: max(16px, calc(12px + env(safe-area-inset-bottom, 0px)));
  z-index: $z-float;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

button {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--c-border);
  background: var(--c-surface);
  color: var(--c-accent-soft);
  backdrop-filter: blur(8px);
  cursor: pointer;
  box-shadow: var(--shadow-glow);
  transition:
    transform 0.15s,
    border-color 0.2s;

  &:hover {
    transform: translateY(-2px);
    border-color: var(--c-accent);
  }
}
</style>
