import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { characters, getCharacterById } from '@/data/characters'
import { qibos, getQiboById } from '@/data/qibos'
import { buildSeo } from '@/seo/meta'
import { DEFAULT_LOCALE, SITE_NAME, THEME_COLOR, getSiteUrl } from '@/seo/site'
import { ogLocaleOf } from '@/i18n'

function ensureMeta(attr, key, content) {
  if (content == null || content === '') return
  const selector = `meta[${attr}="${key}"]`
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function ensureLink(rel, href, extra = {}) {
  if (!href) return
  let el
  if (rel === 'canonical') {
    el = document.head.querySelector('link[rel="canonical"]')
  } else if (extra.hreflang) {
    el = document.head.querySelector(`link[rel="alternate"][hreflang="${extra.hreflang}"]`)
  } else {
    el = document.head.querySelector(`link[rel="${rel}"]`)
  }
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
  if (extra.hreflang) el.setAttribute('hreflang', extra.hreflang)
}

function ensureJsonLd(data) {
  let el = document.getElementById('seo-jsonld')
  if (!el) {
    el = document.createElement('script')
    el.type = 'application/ld+json'
    el.id = 'seo-jsonld'
    document.head.appendChild(el)
  }
  el.textContent = JSON.stringify(data)
}

function applySeo(payload, siteUrl, locale) {
  document.title = payload.title
  ensureMeta('name', 'description', payload.description)
  ensureMeta('name', 'keywords', payload.keywords)
  ensureMeta('name', 'robots', payload.robots)
  ensureMeta('name', 'theme-color', THEME_COLOR)
  ensureMeta('property', 'og:title', payload.title)
  ensureMeta('property', 'og:description', payload.description)
  ensureMeta('property', 'og:type', payload.ogType)
  ensureMeta('property', 'og:site_name', SITE_NAME)
  ensureMeta('property', 'og:locale', ogLocaleOf(locale))
  if (payload.canonical) {
    ensureMeta('property', 'og:url', payload.canonical)
    ensureLink('canonical', payload.canonical)
    ensureLink('alternate', payload.canonical, { hreflang: DEFAULT_LOCALE })
    ensureLink('alternate', payload.canonical, { hreflang: 'x-default' })
  }
  if (payload.ogImage) {
    ensureMeta('property', 'og:image', payload.ogImage)
    ensureMeta('name', 'twitter:image', payload.ogImage)
    ensureMeta('property', 'og:image:alt', payload.ogImageAlt)
  }
  ensureMeta('name', 'twitter:card', payload.ogImage ? 'summary_large_image' : 'summary')
  ensureMeta('name', 'twitter:title', payload.title)
  ensureMeta('name', 'twitter:description', payload.description)
  ensureJsonLd(payload.jsonLd)

  const noscript = document.getElementById('seo-noscript')
  if (noscript) noscript.innerHTML = payload.noscript

  void siteUrl
}

/**
 * 随路由与语言更新 title / description / Open Graph / JSON-LD。
 */
export function useSeo() {
  const route = useRoute()
  const { locale, messages } = useI18n()

  watch(
    () => [route.fullPath, locale.value],
    () => {
      const pack = messages.value?.[locale.value] || messages.value?.[DEFAULT_LOCALE]
      const character =
        route.name === 'character-detail' ? getCharacterById(route.params.id) : null
      const qibo = route.name === 'qibo-detail' ? getQiboById(route.params.id) : null
      const payload = buildSeo({
        path: route.path,
        routeName: route.name,
        siteUrl: getSiteUrl(),
        messages: pack,
        character,
        characters,
        qibo,
        qibos,
        noindex:
          Boolean(route.meta?.noindex) ||
          (route.name === 'character-detail' && !character) ||
          (route.name === 'qibo-detail' && !qibo),
      })
      applySeo(payload, getSiteUrl(), locale.value)
    },
    { immediate: true },
  )
}
