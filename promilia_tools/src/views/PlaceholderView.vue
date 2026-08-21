<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import ModulePlaceholder from '@/components/common/ModulePlaceholder.vue'
import AppBreadcrumb from '@/components/common/AppBreadcrumb.vue'
import { navSections } from '@/data/navigation'

const route = useRoute()
const { t } = useI18n()

const title = computed(() => {
  const path = route.path
  for (const sec of navSections) {
    const hit = sec.children.find((c) => c.path === path)
    if (hit) return hit.label || t(hit.labelKey)
  }
  return t('nav.encyclopedia')
})

const crumbs = computed(() => [
  { to: '/', label: t('nav.home') },
  { label: title.value },
])
</script>

<template>
  <div>
    <AppBreadcrumb :items="crumbs" :label="t('header.breadcrumb')" />
    <ModulePlaceholder :title="title" :description="t('common.placeholder')">
      <p class="hint">{{ t('common.comingSoon') }}</p>
    </ModulePlaceholder>
  </div>
</template>

<style scoped lang="scss">
.hint {
  margin-top: 16px !important;
  color: var(--c-star) !important;
  font-size: 13px;
}
</style>
