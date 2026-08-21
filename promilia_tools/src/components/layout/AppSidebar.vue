<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import SvgIcon from '@jamescoyle/vue-icon'
import { useSettingsStore } from '@/stores/settings'
import { navSections } from '@/data/navigation'
import { SUPPORTED_LOCALES, setAppLocale } from '@/i18n'
import LangSwitcher from '@/components/common/LangSwitcher.vue'
import ThemeSwitcher from '@/components/common/ThemeSwitcher.vue'

const { t } = useI18n()
const route = useRoute()
const settings = useSettingsStore()
const openIds = ref(navSections.map((s) => s.id))

watch(
  () => [route.path, route.name, route.query.from],
  () => {
    const hit = navSections.find((s) => s.children.some((c) => isActive(c.path)))
    if (hit && !openIds.value.includes(hit.id)) {
      openIds.value.push(hit.id)
    }
  },
  { immediate: true },
)

function toggle(id) {
  const i = openIds.value.indexOf(id)
  if (i >= 0) openIds.value.splice(i, 1)
  else openIds.value.push(id)
}

function isActive(path) {
  if (route.path === path || route.path.startsWith(`${path}/`)) return true
  if (route.name === 'item-detail') {
    const from = typeof route.query.from === 'string' ? route.query.from : ''
    if (from) return path === `/encyclopedia/obtain/${from}`
    return path === '/encyclopedia/items'
  }
  return false
}

function isSectionActive(sec) {
  return sec.children.some((c) => isActive(c.path))
}

async function onLocale(code) {
  await setAppLocale(code)
  settings.setLocale(code)
}
</script>

<template>
  <aside
    id="app-sidebar"
    class="app-sidebar"
    :class="{ collapsed: settings.sidebarCollapsed, open: settings.mobileNavOpen }"
    :aria-hidden="settings.isNarrow && !settings.mobileNavOpen"
  >
    <nav class="sidebar-inner" :aria-label="t('header.sectionNav')">
      <section v-for="sec in navSections" :key="sec.id" class="nav-section">
        <button
          type="button"
          class="section-title"
          :class="{ active: isSectionActive(sec) }"
          :title="sec.label || t(sec.labelKey)"
          @click="toggle(sec.id)"
        >
          <svg-icon class="nav-icon" type="mdi" :size="20" :path="sec.icon" aria-hidden="true" />
          <span class="label">{{ sec.label || t(sec.labelKey) }}</span>
          <span class="chev" :class="{ open: openIds.includes(sec.id) }">›</span>
        </button>
        <ul v-show="openIds.includes(sec.id)" class="nav-list">
          <li v-for="item in sec.children" :key="item.id">
            <router-link
              :to="item.path"
              :class="{ active: isActive(item.path) }"
              :title="item.label || t(item.labelKey)"
            >
              <svg-icon class="item-icon" type="mdi" :size="16" :path="item.icon" aria-hidden="true" />
              <span>{{ item.label || t(item.labelKey) }}</span>
            </router-link>
          </li>
        </ul>
      </section>
    </nav>

    <div class="sidebar-tools">
      <p class="tools-label">{{ t('header.language') }} / {{ t('header.theme') }}</p>
      <LangSwitcher
        :locales="SUPPORTED_LOCALES"
        :model-value="settings.locale"
        @update:model-value="onLocale"
      />
      <ThemeSwitcher />
    </div>
  </aside>
</template>

<style scoped lang="scss">
.app-sidebar {
  position: fixed;
  top: calc(#{$header-h} + env(safe-area-inset-top, 0px));
  left: 0;
  bottom: 0;
  width: $sidebar-w;
  z-index: $z-sidebar;
  display: flex;
  flex-direction: column;
  background: var(--c-sidebar);
  border-right: 1px solid var(--c-border);
  overflow: hidden;
  transition:
    width 0.25s ease,
    transform 0.25s ease,
    box-shadow 0.25s ease;
  padding-bottom: env(safe-area-inset-bottom, 0px);

  @media (min-width: 1024px) {
    &.collapsed {
      width: $sidebar-collapsed-w;

      .label,
      .chev,
      .sidebar-tools {
        display: none;
      }

      .nav-list {
        display: none;
      }

      .sidebar-inner {
        padding-left: 8px;
        padding-right: 8px;
      }

      .section-title {
        justify-content: center;
        padding: 12px 0;
      }
    }
  }

  @media (max-width: 1023px) {
    width: min(20rem, calc(100vw - 3.5rem));
    max-width: 100%;
    transform: translateX(-105%);
    pointer-events: none;
    visibility: hidden;
    box-shadow: none;
    overscroll-behavior: contain;
    transition:
      width 0.25s ease,
      transform 0.25s ease,
      box-shadow 0.25s ease,
      visibility 0s linear 0.25s;

    &.open {
      transform: translateX(0);
      pointer-events: auto;
      visibility: visible;
      box-shadow: 12px 0 40px rgba(0, 0, 0, 0.45);
      transition:
        width 0.25s ease,
        transform 0.25s ease,
        box-shadow 0.25s ease,
        visibility 0s;
    }
  }
}

.sidebar-inner {
  flex: 1;
  min-height: 0;
  padding: 12px 10px 16px;
  overflow: hidden auto;
}

.sidebar-tools {
  display: none;
  flex-direction: column;
  gap: 8px;
  padding: 12px 12px 16px;
  border-top: 1px solid var(--c-border);
  background: color-mix(in srgb, var(--c-sidebar) 88%, #000);

  @media (max-width: 1023px) {
    display: flex;
  }

  :deep(.lang-switcher),
  :deep(.theme-switcher) {
    width: 100%;
  }

  :deep(select) {
    max-width: none;
  }
}

.tools-label {
  margin: 0;
  font-size: 11px;
  color: var(--c-text-muted);
  letter-spacing: 0.06em;
}

.nav-section {
  margin-bottom: 6px;
}

.section-title {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 10px;
  border: none;
  border-radius: $radius-sm;
  background: transparent;
  color: var(--c-text);
  cursor: pointer;
  text-align: left;

  &:hover,
  &.active {
    background: rgba(62, 207, 207, 0.08);
  }

  &.active .nav-icon {
    color: var(--c-accent);
  }
}

.nav-icon,
.item-icon {
  display: inline-flex;
  flex-shrink: 0;
  color: var(--c-accent);
}

.item-icon {
  color: var(--c-text-muted);
}

.label {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  transition: opacity 0.2s;
}

.chev {
  color: var(--c-text-muted);
  transition: transform 0.2s;

  &.open {
    transform: rotate(90deg);
  }
}

.nav-list {
  list-style: none;
  margin: 0;
  padding: 0 0 6px 10px;

  a {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: $radius-sm;
    color: var(--c-text-muted);
    font-size: 13px;

    &:hover,
    &.active {
      color: var(--c-accent-soft);
      background: rgba(62, 207, 207, 0.1);

      .item-icon {
        color: var(--c-accent-soft);
      }
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-sidebar,
  .label,
  .chev {
    transition: none;
  }
}
</style>
