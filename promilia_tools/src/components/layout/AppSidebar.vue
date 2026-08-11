<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '@/stores/settings'
import { navSections } from '@/data/navigation'

const { t } = useI18n()
const route = useRoute()
const settings = useSettingsStore()
const openIds = ref(navSections.map((s) => s.id))

watch(
  () => route.path,
  (path) => {
    const hit = navSections.find((s) => s.children.some((c) => path.startsWith(c.path)))
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
  return route.path === path || route.path.startsWith(path + '/')
}
</script>

<template>
  <aside class="app-sidebar" :class="{ collapsed: settings.sidebarCollapsed }">
    <div class="sidebar-inner">
      <section v-for="sec in navSections" :key="sec.id" class="nav-section">
        <button type="button" class="section-title" @click="toggle(sec.id)">
          <span class="dot" :data-icon="sec.icon" />
          <span class="label">{{ t(sec.labelKey) }}</span>
          <span class="chev" :class="{ open: openIds.includes(sec.id) }">›</span>
        </button>
        <ul v-show="openIds.includes(sec.id) && !settings.sidebarCollapsed" class="nav-list">
          <li v-for="item in sec.children" :key="item.id">
            <router-link :to="item.path" :class="{ active: isActive(item.path) }">
              {{ t(item.labelKey) }}
            </router-link>
          </li>
        </ul>
      </section>
    </div>
  </aside>
</template>

<style scoped lang="scss">
.app-sidebar {
  position: fixed;
  top: $header-h;
  left: 0;
  bottom: 0;
  width: $sidebar-w;
  z-index: $z-sidebar;
  background: var(--c-sidebar);
  border-right: 1px solid var(--c-border);
  overflow: hidden auto;
  transition: width 0.25s ease;

  &.collapsed {
    width: 64px;

    .label,
    .chev,
    .nav-list {
      opacity: 0;
      pointer-events: none;
    }

    .section-title {
      justify-content: center;
      padding: 12px 0;
    }
  }

  @media (max-width: 900px) {
    transform: translateX(-100%);
    width: min(80vw, $sidebar-w);

    &:not(.collapsed) {
      transform: translateX(0);
      box-shadow: 8px 0 32px rgba(0, 0, 0, 0.35);
    }

    &.collapsed {
      transform: translateX(-100%);
    }
  }
}

.sidebar-inner {
  padding: 12px 10px 24px;
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

  &:hover {
    background: rgba(62, 207, 207, 0.08);
  }
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--c-accent);
  box-shadow: 0 0 8px var(--c-accent);
  flex-shrink: 0;
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
  padding: 0 0 6px 18px;

  a {
    display: block;
    padding: 7px 10px;
    border-radius: $radius-sm;
    color: var(--c-text-muted);
    font-size: 13px;

    &:hover,
    &.active {
      color: var(--c-accent-soft);
      background: rgba(62, 207, 207, 0.1);
    }
  }
}
</style>
