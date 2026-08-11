<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="not-found">
    <h1>404</h1>
    <p>{{ t('common.empty') }}</p>
    <router-link to="/">{{ t('nav.home') }}</router-link>
  </div>
</template>

<style scoped lang="scss">
.not-found {
  text-align: center;
  padding: 80px 20px;

  h1 {
    margin: 0;
    font-size: 64px;
    color: var(--c-accent);
  }

  p {
    color: var(--c-text-muted);
  }
}
</style>
