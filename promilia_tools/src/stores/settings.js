import { defineStore } from 'pinia'
import { storageGet, storageSet } from '@/utils/storage'
import { MQ_NARROW } from '@/utils/breakpoints'
import { htmlLangOf, resolveInitialLocale } from '@/i18n'

const THEMES = ['azure', 'dusk', 'aurora', 'stardust']

const CURSOR_PRESETS = [
  '#3e61d3',
  '#8aa4f0',
  '#c0a0f0',
  '#3ecfcf',
  '#7deed4',
  '#4cdb8a',
  '#ece24d',
  '#e89ab0',
  '#f34979',
  '#83827f',
]

function randomHex() {
  const h = Math.floor(Math.random() * 360)
  const s = 55 + Math.floor(Math.random() * 30)
  const l = 55 + Math.floor(Math.random() * 15)
  return hslToHex(h, s, l)
}

function hslToHex(h, s, l) {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    locale: resolveInitialLocale(),
    theme: storageGet('theme', 'stardust'),
    cursorEnabled: storageGet('cursorEnabled', true),
    cursorColor: storageGet('cursorColor', CURSOR_PRESETS[0]),
    sidebarCollapsed: storageGet('sidebarCollapsed', false),
    isNarrow: typeof window !== 'undefined' && window.matchMedia(MQ_NARROW).matches,
    mobileNavOpen: false,
  }),
  getters: {
    themes: () => THEMES,
    cursorPresets: () => CURSOR_PRESETS,
  },
  actions: {
    setLocale(locale) {
      this.locale = locale
      storageSet('locale', locale)
    },
    setTheme(theme) {
      if (!THEMES.includes(theme)) return
      this.theme = theme
      storageSet('theme', theme)
      document.documentElement.setAttribute('data-theme', theme)
    },
    setCursorEnabled(v) {
      this.cursorEnabled = !!v
      storageSet('cursorEnabled', this.cursorEnabled)
    },
    setCursorColor(color) {
      this.cursorColor = color
      storageSet('cursorColor', color)
      document.documentElement.style.setProperty('--cursor-color', color)
    },
    randomCursorColor() {
      this.setCursorColor(randomHex())
    },
    cycleTheme() {
      const i = THEMES.indexOf(this.theme)
      this.setTheme(THEMES[(i + 1) % THEMES.length])
    },
    toggleSidebar() {
      const narrow =
        this.isNarrow ||
        (typeof window !== 'undefined' && window.matchMedia(MQ_NARROW).matches)
      if (narrow) {
        this.isNarrow = true
        this.mobileNavOpen = !this.mobileNavOpen
        return
      }
      this.sidebarCollapsed = !this.sidebarCollapsed
      storageSet('sidebarCollapsed', this.sidebarCollapsed)
    },
    setSidebarCollapsed(v) {
      this.sidebarCollapsed = !!v
      storageSet('sidebarCollapsed', this.sidebarCollapsed)
    },
    closeMobileNav() {
      this.mobileNavOpen = false
    },
    setNarrow(narrow) {
      const next = !!narrow
      if (this.isNarrow === next) return
      this.isNarrow = next
      this.mobileNavOpen = false
    },
    applyDom() {
      document.documentElement.setAttribute('data-theme', this.theme)
      document.documentElement.style.setProperty('--cursor-color', this.cursorColor)
      document.documentElement.lang = htmlLangOf(this.locale)
    },
  },
})
