import { replaceRp } from '../utils/replaceRp.js'
import zhCN from '../i18n/locales/zh-CN.js'
import {
  GAME_NAME,
  GAME_NAME_EN,
  GAME_PUBLISHER,
  SITE_NAME,
  SITE_NAME_EN,
  assetUrl,
  characterImagePath,
  qiboImagePath,
  pageUrl,
} from './site.js'

function clip(text, max = 120) {
  const s = String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (s.length <= max) return s
  return `${s.slice(0, max - 1)}…`
}

function uniqueJoin(parts) {
  return [...new Set(parts.map((p) => String(p || '').trim()).filter(Boolean))].join(',')
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function localeOf(messages) {
  return messages?.app?.name ? messages : zhCN
}

function siteLabel(messages) {
  const m = localeOf(messages)
  return `${m.app.name} ${m.app.subtitle}`.trim()
}

function navHref(path) {
  return path.startsWith('/') ? path : `/${path}`
}

function websiteNode(siteUrl, messages) {
  const m = localeOf(messages)
  const url = siteUrl || pageUrl('/')
  return {
    '@type': 'WebSite',
    '@id': url ? `${url.replace(/\/+$/, '')}/#website` : '#website',
    name: siteLabel(m),
    alternateName: [SITE_NAME, SITE_NAME_EN, GAME_NAME, GAME_NAME_EN, m.app.nameEn],
    url: url || undefined,
    inLanguage: ['zh-CN', 'en', 'ja', 'ko'],
    description: m.seo?.homeDescription,
    potentialAction: /^https?:\/\//i.test(String(url))
      ? {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${url.replace(/\/+$/, '')}/encyclopedia/characters?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        }
      : undefined,
    publisher: {
      '@type': 'Organization',
      name: GAME_PUBLISHER,
    },
    about: {
      '@type': 'VideoGame',
      name: GAME_NAME,
      alternateName: GAME_NAME_EN,
      applicationCategory: 'GameApplication',
      genre: ['RPG', '开放世界', '幻想'],
      author: { '@type': 'Organization', name: GAME_PUBLISHER },
    },
  }
}

function breadcrumbList(items, siteUrl) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: pageUrl(item.path, siteUrl),
    })),
  }
}

function noscriptNav(messages) {
  const m = localeOf(messages)
  return `<nav>
  <a href="${navHref('/')}">${escapeHtml(m.nav.home)}</a>
  <a href="${navHref('/encyclopedia/characters')}">${escapeHtml(m.nav.characters)}</a>
  <a href="${navHref('/encyclopedia/qibo')}">${escapeHtml(m.nav.qibo)}</a>
  <a href="${navHref('/contribute')}">${escapeHtml(m.nav.contribute)}</a>
</nav>`
}

export function buildSeo({
  path,
  routeName,
  siteUrl = '',
  messages = zhCN,
  character = null,
  characters = [],
  qibo = null,
  qibos = [],
  noindex = false,
} = {}) {
  const m = localeOf(messages)
  const suffix = m.seo?.titleSuffix || SITE_NAME
  let title = m.seo?.homeTitle || SITE_NAME
  let description = m.seo?.homeDescription || ''
  let keywords = m.seo?.homeKeywords || ''
  let ogType = 'website'
  let ogImage = ''
  let ogImageAlt = m.seo?.ogImageAlt || SITE_NAME
  let robots = noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large'
  const crumbs = [{ name: m.nav.home, path: '/' }]
  let noscriptBody = ''

  if (routeName === 'not-found' || noindex) {
    robots = 'noindex,follow'
  }

  if (routeName === 'home' || path === '/') {
    title = m.seo.homeTitle
    description = m.seo.homeDescription
    keywords = uniqueJoin([
      m.seo.homeKeywords,
      ...characters.slice(0, 8).map((c) => c.name),
    ])
    noscriptBody = `<h1>${escapeHtml(siteLabel(m))}</h1>
<p>${escapeHtml(m.app.tagline)}</p>
<p>${escapeHtml(m.home.welcome)}</p>
<p>${escapeHtml(m.home.intro)}</p>
<h2>${escapeHtml(m.nav.characters)}</h2>
<ul>${characters
      .map(
        (c) =>
          `<li><a href="${navHref(`/encyclopedia/characters/${c.id}`)}">${escapeHtml(c.name)}（${escapeHtml(c.nameEn)}）</a></li>`,
      )
      .join('')}</ul>
<h2>${escapeHtml(m.nav.qibo)}</h2>
<ul>${qibos
      .map(
        (q) =>
          `<li><a href="${navHref(`/encyclopedia/qibo/${q.id}`)}">${escapeHtml(q.name)}</a></li>`,
      )
      .join('')}</ul>`
  } else if (routeName === 'characters' || path === '/encyclopedia/characters') {
    title = m.seo.charactersTitle
    description = m.seo.charactersDescription
    keywords = uniqueJoin([
      m.seo.charactersKeywords,
      ...characters.map((c) => c.name),
      ...characters.map((c) => c.nameEn),
    ])
    crumbs.push({ name: m.nav.characters, path: '/encyclopedia/characters' })
    noscriptBody = `<h1>${escapeHtml(m.character.title)}</h1>
<p>${escapeHtml(m.character.summary.replace(/\$rp/g, String(characters.length)))}</p>
<ul>${characters
      .map(
        (c) =>
          `<li><a href="${navHref(`/encyclopedia/characters/${c.id}`)}">${escapeHtml(c.name)} ${escapeHtml(c.nameEn)} ${escapeHtml((c.elements || []).join('/'))} ${escapeHtml(c.profession)}</a></li>`,
      )
      .join('')}</ul>`
  } else if (routeName === 'character-detail') {
    if (!character) {
      title = m.seo.notFoundTitle
      description = m.common.empty
      robots = 'noindex,follow'
      noscriptBody = `<h1>404</h1><p>${escapeHtml(m.common.empty)}</p>`
    } else {
      const elements = (character.elements || []).join('、')
      title = replaceRp(m.seo.characterTitle, character.name, character.nameEn)
      description = clip(
        `${replaceRp(
          m.seo.characterDescription,
          character.name,
          character.nameEn,
          character.rarity,
          elements,
          character.profession,
          character.faction,
        )}${character.intro || ''}`,
        140,
      )
      keywords = uniqueJoin([
        replaceRp(m.seo.characterKeywords, character.name, character.nameEn, character.name),
        elements,
        character.profession,
        character.faction,
        character.role,
        ...(character.tags || []),
        ...(character.skills || []).map((sk) => sk.name),
        GAME_NAME,
      ])
      ogType = 'article'
      ogImage = assetUrl(characterImagePath(character.id), siteUrl)
      ogImageAlt = replaceRp(m.seo.portraitAlt, character.name, character.nameEn)
      crumbs.push({ name: m.nav.characters, path: '/encyclopedia/characters' })
      crumbs.push({
        name: character.name,
        path: `/encyclopedia/characters/${character.id}`,
      })
      const skills = (character.skills || [])
        .map(
          (sk) =>
            `<h3>${escapeHtml(sk.name)} ${escapeHtml(sk.type || '')}</h3><p>${escapeHtml(sk.desc || '')}</p>`,
        )
        .join('')
      noscriptBody = `<article>
<h1>${escapeHtml(character.name)}</h1>
<p>${escapeHtml(character.nameEn)}</p>
<p>${escapeHtml(character.intro || '')}</p>
<p>${escapeHtml(String(character.rarity))}★ ${escapeHtml(elements)} ${escapeHtml(character.profession || '')} ${escapeHtml(character.faction || '')}</p>
<img src="${navHref(characterImagePath(character.id))}" alt="${escapeHtml(ogImageAlt)}" />
<h2>${escapeHtml(m.common.skills)}</h2>
${skills}
</article>`
    }
  } else if (routeName === 'qibo' || path === '/encyclopedia/qibo') {
    title = m.seo.qiboTitle
    description = m.seo.qiboDescription
    keywords = uniqueJoin([m.seo.qiboKeywords, ...qibos.map((q) => q.name)])
    crumbs.push({ name: m.nav.qibo, path: '/encyclopedia/qibo' })
    noscriptBody = `<h1>${escapeHtml(m.qibo.title)}</h1>
<ul>${qibos
      .map(
        (q) =>
          `<li><a href="${navHref(`/encyclopedia/qibo/${q.id}`)}">${escapeHtml(q.name)}</a> ${escapeHtml((q.elements || []).join('/'))} ${escapeHtml(q.intro || '')}</li>`,
      )
      .join('')}</ul>`
  } else if (routeName === 'qibo-detail' || /^\/encyclopedia\/qibo\/[^/]+$/.test(path)) {
    if (!qibo) {
      title = m.seo.notFoundTitle
      description = m.common.empty
      robots = 'noindex,follow'
      noscriptBody = `<h1>404</h1><p>${escapeHtml(m.common.empty)}</p>`
    } else {
      const elements = (qibo.elements || []).join('、')
      title = replaceRp(m.seo.qiboDetailTitle, qibo.name, qibo.no)
      description = clip(
        `${replaceRp(
          m.seo.qiboDetailDescription,
          qibo.name,
          elements,
          qibo.race,
          qibo.stage,
        )}${qibo.intro || ''}`,
        140,
      )
      keywords = uniqueJoin([
        replaceRp(m.seo.qiboDetailKeywords, qibo.name, qibo.name),
        elements,
        qibo.race,
        qibo.stage,
        qibo.battleTag,
        ...(qibo.skills || []).map((sk) => sk.name),
        ...(qibo.properties || []).map((prop) => prop.name),
        GAME_NAME,
      ])
      ogType = 'article'
      ogImage = assetUrl(qibo.image || qiboImagePath(qibo.id), siteUrl)
      ogImageAlt = replaceRp(m.seo.qiboImageAlt, qibo.name, qibo.no)
      crumbs.push({ name: m.nav.qibo, path: '/encyclopedia/qibo' })
      crumbs.push({
        name: qibo.name,
        path: `/encyclopedia/qibo/${qibo.id}`,
      })
      const skills = (qibo.skills || [])
        .map((sk) => `<h3>${escapeHtml(sk.name)}</h3><p>${escapeHtml(sk.desc || '')}</p>`)
        .join('')
      const properties = (qibo.properties || [])
        .map((prop) => `<h3>${escapeHtml(prop.name)}</h3><p>${escapeHtml(prop.desc || '')}</p>`)
        .join('')
      noscriptBody = `<article>
<h1>${escapeHtml(qibo.name)}</h1>
<p>NO.${escapeHtml(String(qibo.no ?? ''))} ${escapeHtml(elements)} ${escapeHtml(qibo.race || '')} ${escapeHtml(qibo.stage || '')}</p>
<p>${escapeHtml(qibo.intro || '')}</p>
<img src="${navHref(qibo.image || qiboImagePath(qibo.id))}" alt="${escapeHtml(ogImageAlt)}" />
<h2>${escapeHtml(m.common.skills)}</h2>
${skills}
<h2>${escapeHtml(m.qibo.properties)}</h2>
${properties}
</article>`
    }
  } else if (routeName === 'contribute' || path === '/contribute') {
    title = m.seo.contributeTitle
    description = m.seo.contributeDescription
    keywords = m.seo.contributeKeywords || m.seo.homeKeywords
    crumbs.push({ name: m.nav.contribute, path: '/contribute' })
    noscriptBody = `<h1>${escapeHtml(m.contribute.title)}</h1>
<p>${escapeHtml(m.contribute.howToDesc)}</p>`
  } else if (routeName === 'not-found') {
    title = m.seo.notFoundTitle
    description = m.common.empty
    robots = 'noindex,follow'
    noscriptBody = `<h1>404</h1><p>${escapeHtml(m.common.empty)}</p>`
  } else {
    const pageTitle = m.seo.placeholderTitle || suffix
    title = path.includes('/guides/')
      ? `${m.nav.guides}｜${suffix}`
      : path.includes('/story/')
        ? `${m.nav.story}｜${suffix}`
        : path.includes('/tools/')
          ? `${m.nav.tools}｜${suffix}`
          : `${m.nav.encyclopedia}｜${suffix}`
    description = m.seo.placeholderDescription
    keywords = m.seo.homeKeywords
    robots = 'noindex,follow'
    noscriptBody = `<h1>${escapeHtml(pageTitle)}</h1><p>${escapeHtml(m.common.placeholder)}</p>`
  }

  const canonical = pageUrl(path === '/' ? '/' : path, siteUrl)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      websiteNode(siteUrl, m),
      {
        '@type': 'WebPage',
        '@id': canonical ? `${canonical}#webpage` : '#webpage',
        url: canonical || undefined,
        name: title,
        description,
        inLanguage: 'zh-CN',
        isPartOf: { '@id': websiteNode(siteUrl, m)['@id'] },
        primaryImageOfPage: ogImage || undefined,
        mainEntity: character
          ? { '@id': `${canonical}#character` }
          : qibo
            ? { '@id': `${canonical}#qibo` }
            : undefined,
      },
      breadcrumbList(crumbs, siteUrl),
      ...(character
        ? [
            {
              '@type': 'Person',
              '@id': `${canonical}#character`,
              name: character.name,
              alternateName: character.nameEn,
              description: clip(character.intro, 200),
              image: ogImage || undefined,
              affiliation: character.faction,
              jobTitle: character.profession,
            },
          ]
        : []),
      ...(qibo
        ? [
            {
              '@type': 'Thing',
              '@id': `${canonical}#qibo`,
              name: qibo.name,
              alternateName: qibo.wikiSlug,
              description: clip(qibo.intro, 200),
              image: ogImage || undefined,
              identifier: qibo.no != null ? `NO.${qibo.no}` : undefined,
            },
          ]
        : []),
    ],
  }

  const noscript = `${noscriptBody}\n${noscriptNav(m)}`

  return {
    title,
    description: clip(description, 160),
    keywords,
    canonical,
    robots,
    ogType,
    ogImage,
    ogImageAlt,
    jsonLd,
    noscript,
    crumbs,
  }
}

export const INDEXABLE_STATIC_PATHS = [
  { path: '/', name: 'home', changefreq: 'daily', priority: '1.0' },
  { path: '/encyclopedia/characters', name: 'characters', changefreq: 'weekly', priority: '0.9' },
  { path: '/encyclopedia/qibo', name: 'qibo', changefreq: 'weekly', priority: '0.9' },
  { path: '/contribute', name: 'contribute', changefreq: 'monthly', priority: '0.5' },
]

/** 建设中的栏目：预渲染但 noindex，避免薄内容进索引 */
export const PLACEHOLDER_PATHS = [
  '/encyclopedia/gatherables',
  '/encyclopedia/goods',
  '/encyclopedia/spirit',
  '/encyclopedia/equipment',
  '/encyclopedia/items',
  '/encyclopedia/cuisine',
  '/encyclopedia/achievements',
  '/encyclopedia/affixes',
  '/guides/character',
  '/guides/qibo',
  '/guides/farm',
  '/guides/puzzle',
  '/guides/event',
  '/story/main',
  '/story/side',
  '/tools/gacha',
  '/tools/team',
  '/tools/map',
]
