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
}

const loaders = {
  'zh-CN': () => Promise.resolve(zhCN),
  'en-US': () => import('./locales/en-US').then((m) => m.default),
  'ja-JP': () => import('./locales/ja-JP').then((m) => m.default),
}

const initial = storageGet('locale', 'zh-CN')

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
  document.documentElement.lang = code.startsWith('zh') ? 'zh-CN' : code.startsWith('ja') ? 'ja' : 'en'
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
