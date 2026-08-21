/**
 * 站点级 SEO 配置。
 *
 * 部署后请填写 CONFIGURED_SITE_URL（不含末尾斜杠），
 * 或在环境变量 VITE_SITE_URL 中设置。绝对地址用于 sitemap、
 * canonical、Open Graph；不填时运行时会回退到当前域名。
 *
 * 例：https://wiki.example.com
 * 例：https://username.github.io/promilia_tools
 */
export const CONFIGURED_SITE_URL = ''

export const SITE_NAME = '蓝色星原：旅谣 Wiki'
export const SITE_NAME_EN = 'Azur Promilia Wiki'
export const GAME_NAME = '蓝色星原：旅谣'
export const GAME_NAME_EN = 'Azur Promilia'
export const GAME_PUBLISHER = '蛮啾网络'
export const THEME_COLOR = '#071018'
export const DEFAULT_LOCALE = 'zh-CN'

export function readConfiguredSiteUrl() {
  const fromEnv =
    typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SITE_URL : ''
  const raw = String(fromEnv || CONFIGURED_SITE_URL || '').trim()
  return raw.replace(/\/+$/, '')
}

export function getBasePath() {
  const base = typeof import.meta !== 'undefined' ? import.meta.env?.BASE_URL : '/'
  if (!base || base === '/') return '/'
  return base.endsWith('/') ? base : `${base}/`
}

export function getSiteUrl() {
  const configured = readConfiguredSiteUrl()
  if (configured) return configured
  if (typeof window === 'undefined') return ''
  const origin = window.location.origin
  const base = getBasePath()
  if (!base || base === '/') return origin
  return `${origin}${base.replace(/\/+$/, '')}`
}

/** 站点内路径 → 绝对或根相对 URL */
export function pageUrl(path, siteUrl = getSiteUrl()) {
  const pathname = path.startsWith('/') ? path : `/${path}`
  const origin = String(siteUrl || '').replace(/\/+$/, '')
  if (!origin) return pathname
  return `${origin}${pathname}`
}

export function assetUrl(path, siteUrl = getSiteUrl()) {
  const pathname = path.startsWith('/') ? path : `/${path}`
  return pageUrl(pathname, siteUrl)
}

export function characterImagePath(id) {
  return `/imgs/characters/${id}.png`
}

export function qiboImagePath(id) {
  return `/imgs/qibos/${id}.png`
}

export function itemImagePath(id) {
  return `/imgs/items/${id}.png`
}
