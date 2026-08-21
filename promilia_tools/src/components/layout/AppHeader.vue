<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '@/stores/settings'
import { SUPPORTED_LOCALES, setAppLocale } from '@/i18n'
import LangSwitcher from '@/components/common/LangSwitcher.vue'
import ThemeSwitcher from '@/components/common/ThemeSwitcher.vue'
import SiteSearch from '@/components/layout/SiteSearch.vue'

const { t } = useI18n()
const settings = useSettingsStore()
const showCursorPanel = ref(false)

const navExpanded = computed(() =>
  settings.isNarrow ? settings.mobileNavOpen : !settings.sidebarCollapsed,
)

const navLabel = computed(() => {
  if (settings.isNarrow) {
    return settings.mobileNavOpen ? t('header.closeNav') : t('header.openNav')
  }
  return t('header.collapseNav')
})

async function onLocale(code) {
  await setAppLocale(code)
  settings.setLocale(code)
}
</script>

<template>
  <header class="app-header">
    <div class="header-left">
      <button
        type="button"
        class="icon-btn menu-btn"
        :class="{ open: navExpanded }"
        :title="navLabel"
        :aria-label="navLabel"
        :aria-expanded="navExpanded"
        aria-controls="app-sidebar"
        @click="settings.toggleSidebar()"
      >
        <span class="bars" aria-hidden="true" />
      </button>
      <router-link to="/" class="brand">
        <span class="brand-mark" aria-hidden="true" />
        <span class="brand-text">
          <strong>{{ t('app.name') }}</strong>
          <small>{{ t('app.subtitle') }}</small>
        </span>
      </router-link>
    </div>

    <nav class="header-nav" :aria-label="t('header.quickNav')">
      <router-link to="/encyclopedia/characters">{{ t('nav.characters') }}</router-link>
      <router-link to="/encyclopedia/qibo">{{ t('nav.qibo') }}</router-link>
      <router-link to="/encyclopedia/items">{{ t('nav.items') }}</router-link>
      <router-link to="/tools/gacha">{{ t('nav.gacha') }}</router-link>
      <router-link to="/contribute">{{ t('nav.contribute') }}</router-link>
    </nav>

    <div class="header-search">
      <SiteSearch />
    </div>

    <div class="header-actions">
      <LangSwitcher
        class="chrome-switcher"
        :locales="SUPPORTED_LOCALES"
        :model-value="settings.locale"
        @update:model-value="onLocale"
      />
      <ThemeSwitcher class="chrome-switcher" />
      <div class="cursor-wrap">
        <button
          type="button"
          class="icon-btn"
          :class="{ active: settings.cursorEnabled }"
          :title="t('header.toggleCursor')"
          :aria-expanded="showCursorPanel"
          @click="showCursorPanel = !showCursorPanel"
        >
          ✦
        </button>
        <div v-if="showCursorPanel" class="cursor-panel" @mouseleave="showCursorPanel = false">
          <label class="row">
            <input
              type="checkbox"
              :checked="settings.cursorEnabled"
              @change="settings.setCursorEnabled($event.target.checked)"
            />
            {{ t('header.toggleCursor') }}
          </label>
          <p class="label">{{ t('header.cursorColor') }}</p>
          <div class="swatches">
            <button
              v-for="c in settings.cursorPresets"
              :key="c"
              type="button"
              class="swatch"
              :style="{ background: c }"
              :class="{ active: settings.cursorColor === c }"
              @click="settings.setCursorColor(c)"
            />
            <input
              type="color"
              class="color-input"
              :value="settings.cursorColor"
              @input="settings.setCursorColor($event.target.value)"
            />
          </div>
          <button type="button" class="text-btn" @click="settings.randomCursorColor()">
            {{ t('header.randomColor') }}
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped lang="scss">
.app-header {
  position: sticky;
  top: 0;
  z-index: $z-header;
  height: calc(#{$header-h} + env(safe-area-inset-top, 0px));
  padding: env(safe-area-inset-top, 0px) max(12px, env(safe-area-inset-right, 0px)) 0
    max(12px, env(safe-area-inset-left, 0px));
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--c-header);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--c-border);

  @media (max-width: 1023px) {
    gap: 8px;
  }
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;

  @media (max-width: 1199px) {
    flex: 1;
  }
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--c-text);
  min-width: 0;

  &:hover {
    color: var(--c-text);
  }
}

.brand-mark {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 50%;
  background:
    radial-gradient(circle at 35% 35%, #fff8, transparent 40%),
    conic-gradient(from 210deg, var(--c-accent), var(--c-star), var(--c-accent-soft), var(--c-accent));
  box-shadow: var(--shadow-glow);
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
  min-width: 0;

  strong {
    font-size: 15px;
    font-weight: 650;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  small {
    font-size: 11px;
    color: var(--c-text-muted);
  }

  @media (max-width: 719px) {
    small {
      display: none;
    }
  }

  @media (max-width: 379px) {
    display: none;
  }
}

.header-nav {
  display: flex;
  gap: 14px;
  margin-left: auto;
  margin-right: 8px;
  flex-shrink: 0;

  a {
    color: var(--c-text-muted);
    font-size: 13px;
    padding: 4px 0;
    border-bottom: 2px solid transparent;
    white-space: nowrap;

    &.router-link-active,
    &:hover {
      color: var(--c-accent-soft);
      border-bottom-color: var(--c-accent);
    }
  }

  @media (max-width: 1199px) {
    display: none;
  }
}

.header-search {
  flex: 1 1 200px;
  max-width: 400px;
  min-width: 0;

  @media (max-width: 1199px) {
    margin-left: auto;
    max-width: 280px;
  }

  @media (max-width: 1023px) {
    flex: 0 0 auto;
    max-width: none;
    margin-left: 0;
    width: auto;
  }
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;

  @media (max-width: 1199px) {
    margin-left: 0;
  }

  @media (max-width: 1023px) {
    gap: 6px;

    .chrome-switcher {
      display: none;
    }
  }
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

  &:hover,
  &.active,
  &.open {
    border-color: var(--c-accent);
    background: rgba(62, 207, 207, 0.1);
  }
}

.bars {
  width: 14px;
  height: 10px;
  position: relative;
  border-top: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  background: linear-gradient(currentColor, currentColor) center / 100% 2px no-repeat;
  transition:
    transform 0.2s,
    border-color 0.2s,
    background 0.2s;

  .menu-btn.open & {
    height: 0;
    border-color: transparent;
    background: none;

    &::before,
    &::after {
      content: '';
      position: absolute;
      left: 0;
      top: -1px;
      width: 14px;
      height: 2px;
      background: currentColor;
    }

    &::before {
      transform: rotate(45deg);
    }

    &::after {
      transform: rotate(-45deg);
    }
  }
}

.cursor-wrap {
  position: relative;
}

.cursor-panel {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  width: min(220px, calc(100vw - 24px));
  padding: 12px;
  border-radius: $radius-md;
  background: var(--c-bg-elevated);
  border: 1px solid var(--c-border);
  box-shadow: var(--shadow-glow);
  z-index: 2;
}

.row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  margin-bottom: 10px;
}

.label {
  margin: 0 0 6px;
  font-size: 12px;
  color: var(--c-text-muted);
}

.swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.swatch {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;

  &.active {
    border-color: #fff;
  }
}

.color-input {
  width: 28px;
  height: 22px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}

.text-btn {
  width: 100%;
  border: 1px dashed var(--c-border);
  background: transparent;
  color: var(--c-accent-soft);
  border-radius: $radius-sm;
  padding: 6px;
  cursor: pointer;

  &:hover {
    border-color: var(--c-accent);
  }
}
</style>
