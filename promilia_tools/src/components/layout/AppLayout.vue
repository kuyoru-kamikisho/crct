<script setup>
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { setAppLocale } from '@/i18n'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import FloatActions from '@/components/layout/FloatActions.vue'

const settings = useSettingsStore()

let cursorApi = null

const mainClass = computed(() => ({
  'is-collapsed': settings.sidebarCollapsed,
}))

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
  if (window.innerWidth <= 900) {
    settings.setSidebarCollapsed(true)
  }
  await setAppLocale(settings.locale)
  await setupCursor()
})

onUnmounted(() => {
  cursorApi?.disable()
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
  <div class="app-shell" :class="mainClass">
    <AppHeader />
    <div class="app-body">
      <AppSidebar />
      <main class="app-main" id="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade-slide" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
    <AppFooter />
    <FloatActions />
  </div>
</template>

<style scoped lang="scss">
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-body {
  flex: 1;
  display: flex;
  min-height: 0;
  width: 100%;
}

.app-main {
  flex: 1;
  min-width: 0;
  padding: 20px 24px 40px;
  margin-left: $sidebar-w;
  transition: margin-left 0.25s ease;

  @media (max-width: 900px) {
    margin-left: 0;
    padding: 16px;
  }
}

.app-shell.is-collapsed .app-main {
  margin-left: 64px;

  @media (max-width: 900px) {
    margin-left: 0;
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
</style>
