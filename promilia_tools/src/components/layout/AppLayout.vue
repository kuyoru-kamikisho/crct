<script setup>
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useSettingsStore } from '@/stores/settings'
import { setAppLocale } from '@/i18n'
import { MQ_NARROW } from '@/utils/breakpoints'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import FloatActions from '@/components/layout/FloatActions.vue'

const settings = useSettingsStore()
const route = useRoute()

let cursorApi = null
let narrowQuery = null

const shellClass = computed(() => ({
  'is-collapsed': settings.sidebarCollapsed && !settings.isNarrow,
  'is-narrow': settings.isNarrow,
  'nav-open': settings.mobileNavOpen,
}))

const drawerOpen = computed(() => settings.isNarrow && settings.mobileNavOpen)

function syncNarrow(event) {
  settings.setNarrow(event.matches)
}

function onKeydown(event) {
  if (event.key === 'Escape') settings.closeMobileNav()
}

async function setupCursor() {
  if (!cursorApi) {
    const mod = await import('@/cursor/hollow-triangle.js')
    cursorApi = mod.default
  }
  if (settings.cursorEnabled) {
    cursorApi.enable({ color: settings.cursorColor })
  } else {
    cursorApi.disable()
  }
}

onMounted(async () => {
  settings.applyDom()
  narrowQuery = window.matchMedia(MQ_NARROW)
  settings.setNarrow(narrowQuery.matches)
  if (typeof narrowQuery.addEventListener === 'function') {
    narrowQuery.addEventListener('change', syncNarrow)
  } else {
    narrowQuery.addListener(syncNarrow)
  }
  window.addEventListener('keydown', onKeydown)
  await setAppLocale(settings.locale)
  await setupCursor()
})

onUnmounted(() => {
  cursorApi?.disable()
  window.removeEventListener('keydown', onKeydown)
  if (!narrowQuery) return
  if (typeof narrowQuery.removeEventListener === 'function') {
    narrowQuery.removeEventListener('change', syncNarrow)
  } else {
    narrowQuery.removeListener(syncNarrow)
  }
  document.body.classList.remove('nav-locked')
})

watch(
  () => route.fullPath,
  () => settings.closeMobileNav(),
)

watch(drawerOpen, (open) => {
  document.body.classList.toggle('nav-locked', open)
})

watch(
  () => settings.cursorEnabled,
  (v) => {
    if (!cursorApi) return
    v ? cursorApi.enable({ color: settings.cursorColor }) : cursorApi.disable()
  },
)

watch(
  () => settings.cursorColor,
  (c) => cursorApi?.setColor(c),
)

watch(
  () => settings.theme,
  () => {
    cursorApi?.syncThemeColor?.()
    if (settings.cursorColor) cursorApi?.setColor(settings.cursorColor)
  },
)
</script>

<template>
  <div class="app-shell" :class="shellClass">
    <AppHeader />
    <div
      class="nav-backdrop"
      :class="{ show: drawerOpen }"
      aria-hidden="true"
      @click="settings.closeMobileNav()"
    />
    <div class="app-body">
      <AppSidebar />
      <main class="app-main" id="main-content" :inert="drawerOpen">
        <router-view v-slot="{ Component }">
          <transition name="fade-slide" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
    <AppFooter :inert="drawerOpen" />
    <FloatActions />
  </div>
</template>

<style scoped lang="scss">
.app-shell {
  --sidebar-offset: #{$sidebar-w};
  --header-offset: calc(#{$header-h} + env(safe-area-inset-top, 0px));
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;

  &.is-collapsed {
    --sidebar-offset: #{$sidebar-collapsed-w};
  }

  @media (max-width: 1023px) {
    --sidebar-offset: 0px;
  }
}

.app-body {
  flex: 1;
  display: flex;
  min-height: 0;
  min-width: 0;
  width: 100%;
}

.app-main {
  flex: 1;
  min-width: 0;
  padding: 20px 24px 40px;
  padding-left: max(24px, env(safe-area-inset-left, 0px));
  padding-right: max(24px, env(safe-area-inset-right, 0px));
  margin-left: var(--sidebar-offset);
  transition: margin-left 0.25s ease;

  @media (max-width: 1023px) {
    padding: 16px max(16px, env(safe-area-inset-right, 0px)) 48px
      max(16px, env(safe-area-inset-left, 0px));
  }

  @media (max-width: 479px) {
    padding: 12px max(12px, env(safe-area-inset-right, 0px)) 56px
      max(12px, env(safe-area-inset-left, 0px));
  }
}

.nav-backdrop {
  display: none;
}

@media (max-width: 1023px) {
  .nav-backdrop {
    display: block;
    position: fixed;
    top: var(--header-offset);
    right: 0;
    bottom: 0;
    left: 0;
    z-index: $z-backdrop;
    background: rgba(2, 8, 12, 0.55);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.25s ease;

    &.show {
      opacity: 1;
      pointer-events: auto;
    }
  }
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {
  .app-main,
  .nav-backdrop,
  .fade-slide-enter-active,
  .fade-slide-leave-active {
    transition: none;
  }
}
</style>
