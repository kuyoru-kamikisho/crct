/**
 * 多语言入口 —— 社区贡献者扩展语言请看同目录 README.md
 *
 * 扩展步骤：
 * 1. 在 locales/ 下新增 xx-YY.js（复制 zh-CN.js 翻译）
 * 2. 在本文件 SUPPORTED_LOCALES 与 loaders 中注册
 * 3. 提交 PR
 */
import { createI18n } from 'vue-i18n'
import zhCN from './locales/zh-CN'
import { storageGet } from '@/utils/storage'

/** @type {Record<string, { code: string, name: string, nativeName: string }>} */
export const SUPPORTED_LOCALES = {
  'zh-CN': { code: 'zh-CN', name: 'Chinese', nativeName: '简体中文' },
  'en-US': { code: 'en-US', name: 'English', nativeName: 'English' },
  'ja-JP': { code: 'ja-JP', name: 'Japanese', nativeName: '日本語' },
  'ko-KR': { code: 'ko-KR', name: 'Korean', nativeName: '한국어' },
}

const loaders = {
  'zh-CN': () => Promise.resolve(zhCN),
  'en-US': () => import('./locales/en-US').then((m) => m.default),
  'ja-JP': () => import('./locales/ja-JP').then((m) => m.default),
  'ko-KR': () => import('./locales/ko-KR').then((m) => m.default),
}

/** @param {string} [code] */
export function htmlLangOf(code) {
  if (!code) return 'zh-CN'
  if (code.startsWith('zh')) return 'zh-CN'
  if (code.startsWith('ja')) return 'ja'
  if (code.startsWith('ko')) return 'ko'
  return 'en'
}

/** @param {string} [code] */
export function ogLocaleOf(code) {
  if (!code) return 'zh_CN'
  if (code.startsWith('zh')) return 'zh_CN'
  if (code.startsWith('ja')) return 'ja_JP'
  if (code.startsWith('ko')) return 'ko_KR'
  return 'en_US'
}

/**
 * 按浏览器首选语言匹配已支持的 locale。
 * 优先精确匹配（zh-CN），再按语言前缀匹配（zh → zh-CN、en-GB → en-US）。
 * @param {Record<string, unknown>} [locales]
 */
export function detectBrowserLocale(locales = SUPPORTED_LOCALES) {
  const codes = Object.keys(locales)
  const fallback = codes.includes('zh-CN') ? 'zh-CN' : codes[0]
  if (typeof navigator === 'undefined' || !codes.length) return fallback

  const candidates = [
    ...(Array.isArray(navigator.languages) ? navigator.languages : []),
    navigator.language,
  ].filter(Boolean)

  for (const raw of candidates) {
    const tag = String(raw).replace(/_/g, '-')
    const lower = tag.toLowerCase()
    const exact = codes.find((c) => c.toLowerCase() === lower)
    if (exact) return exact
    const prefix = lower.split('-')[0]
    const fuzzy = codes.find(
      (c) => c.toLowerCase() === prefix || c.toLowerCase().startsWith(`${prefix}-`),
    )
    if (fuzzy) return fuzzy
  }
  return fallback
}

/** 已保存的偏好优先；否则跟随浏览器首选语言。 */
export function resolveInitialLocale() {
  const stored = storageGet('locale', null)
  if (stored && stored in SUPPORTED_LOCALES) return stored
  return detectBrowserLocale()
}

const initial = resolveInitialLocale()

export const i18n = createI18n({
  legacy: false,
  locale: initial in SUPPORTED_LOCALES ? initial : 'zh-CN',
  fallbackLocale: 'zh-CN',
  messages: { 'zh-CN': zhCN },
  missingWarn: false,
  fallbackWarn: false,
})

/**
 * 切换语言；未加载过的语言会按需动态 import，利于首屏。
 * @param {string} code
 */
export async function setAppLocale(code) {
  if (!(code in SUPPORTED_LOCALES)) {
    console.warn(`[i18n] unsupported locale: ${code}`)
    return false
  }
  if (!i18n.global.availableLocales.includes(code)) {
    const messages = await loaders[code]()
    i18n.global.setLocaleMessage(code, messages)
  }
  i18n.global.locale.value = code
  document.documentElement.lang = htmlLangOf(code)
  return true
}

/**
 * 社区扩展：运行时注册额外语言包
 * @param {string} code
 * @param {{ name: string, nativeName: string }} meta
 * @param {object|(() => Promise<object>)} messagesOrLoader
 */
export function registerLocale(code, meta, messagesOrLoader) {
  SUPPORTED_LOCALES[code] = { code, ...meta }
  if (typeof messagesOrLoader === 'function') {
    loaders[code] = messagesOrLoader
  } else {
    loaders[code] = () => Promise.resolve(messagesOrLoader)
    i18n.global.setLocaleMessage(code, messagesOrLoader)
  }
}

export default i18n
