export function readThemeColors() {
  const s = getComputedStyle(document.documentElement)
  const pick = (name, fallback) => s.getPropertyValue(name).trim() || fallback
  return {
    text: pick('--c-text', '#d8ebe8'),
    muted: pick('--c-text-muted', '#8aa8a8'),
    accent: pick('--c-accent', '#3ecfcf'),
    accentSoft: pick('--c-accent-soft', '#7ed4c0'),
    border: pick('--c-border', 'rgba(110, 190, 210, 0.2)'),
    surface: pick('--c-surface-solid', '#0e2434'),
    bg: pick('--c-bg', '#071018'),
    star: pick('--c-star', '#e8c97a'),
  }
}

export const SERIES_PALETTE = [
  '#3ecfcf',
  '#e8c97a',
  '#7ed4c0',
  '#e89ab0',
  '#8aa4f0',
  '#4cdb8a',
  '#f0a060',
  '#c8a0f0',
  '#70d4e8',
  '#f08080',
  '#a8e080',
  '#f0d0a0',
  '#9ad4f0',
  '#d4a0c8',
  '#80d0b0',
]

export function requestChartFullscreen(el) {
  if (!el) return
  const fn = el.requestFullscreen || el.webkitRequestFullscreen
  fn?.call(el)
}

export function exitChartFullscreen() {
  const fn = document.exitFullscreen || document.webkitExitFullscreen
  fn?.call(document)
}

export function isChartFullscreen(el) {
  const current = document.fullscreenElement || document.webkitFullscreenElement
  return current === el
}
