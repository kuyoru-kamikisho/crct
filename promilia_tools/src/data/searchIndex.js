import { characters } from '@/data/characters'
import { qibos } from '@/data/qibos'
import { navSections } from '@/data/navigation'
import zhCN from '@/i18n/locales/zh-CN'

function collectStrings(value, out = []) {
  if (value == null || typeof value === 'boolean') return out
  if (typeof value === 'string' || typeof value === 'number') {
    const s = String(value).trim()
    if (s) out.push(s)
    return out
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out)
    return out
  }
  if (typeof value === 'object') {
    for (const nested of Object.values(value)) collectStrings(nested, out)
  }
  return out
}

function uniqueJoin(parts) {
  return [...new Set(parts.filter(Boolean).map((s) => String(s).trim()).filter(Boolean))].join(' ')
}

function getPath(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj)
}

/**
 * 构建全站搜索文档。角色/技能/奇波来自图鉴数据；页面标题可并入多语言文案。
 * @param {object[]} [locales]
 */
export function buildSearchDocuments(locales = [zhCN]) {
  const packs = locales.length ? locales : [zhCN]

  function allLocaleText(path) {
    return uniqueJoin(packs.map((loc) => getPath(loc, path)).filter((v) => typeof v === 'string'))
  }

  function localeGroupText(...sectionKeys) {
    const out = []
    for (const loc of packs) {
      for (const key of sectionKeys) collectStrings(loc[key], out)
    }
    return uniqueJoin(out)
  }
  /** @type {Array<{
   *   id: string
   *   kind: 'character' | 'skill' | 'qibo' | 'page'
   *   title: string
   *   aliases: string
   *   subtitle: string
   *   text: string
   *   owner?: string
   *   labelKey?: string
   *   to: string | { name: string, params?: object, query?: object }
   * }>} */
  const docs = []

  docs.push({
    id: 'page:home',
    kind: 'page',
    title: zhCN.nav.home,
    labelKey: 'nav.home',
    aliases: uniqueJoin([allLocaleText('nav.home'), allLocaleText('app.name'), allLocaleText('app.nameEn')]),
    subtitle: zhCN.app.tagline,
    text: localeGroupText('home', 'app'),
    to: '/',
  })

  for (const section of navSections) {
    for (const child of section.children) {
      docs.push({
        id: `page:${child.path}`,
        kind: 'page',
        title: getPath(zhCN, child.labelKey) || child.id,
        labelKey: child.labelKey,
        aliases: allLocaleText(child.labelKey),
        subtitle: getPath(zhCN, section.labelKey) || '',
        text: uniqueJoin([
          allLocaleText(child.labelKey),
          allLocaleText(section.labelKey),
          child.path,
          child.id,
        ]),
        to: child.path,
      })
    }
  }

  for (const c of characters) {
    const { skills = [], ...meta } = c
    const skillNames = skills.flatMap((sk) => [sk?.name, sk?.type])
    docs.push({
      id: `character:${c.id}`,
      kind: 'character',
      title: c.name,
      aliases: uniqueJoin([c.nameEn, c.id]),
      subtitle: [c.nameEn, ...(c.elements ?? []), c.profession].filter(Boolean).join(' · '),
      text: uniqueJoin([...collectStrings(meta), ...skillNames]),
      to: { name: 'character-detail', params: { id: c.id } },
    })

    skills.forEach((sk, index) => {
      if (!sk?.name) return
      docs.push({
        id: `skill:${c.id}:${index}`,
        kind: 'skill',
        title: sk.name,
        aliases: sk.type || '',
        subtitle: sk.type || '',
        owner: c.name,
        text: uniqueJoin(collectStrings({ name: sk.name, type: sk.type, desc: sk.desc, skillSerect: sk.skillSerect })),
        to: {
          name: 'character-detail',
          params: { id: c.id },
          query: { skill: sk.name },
        },
      })
    })
  }

  for (const qibo of qibos) {
    docs.push({
      id: `qibo:${qibo.id}`,
      kind: 'qibo',
      title: qibo.name,
      aliases: uniqueJoin([qibo.id, qibo.no != null ? `NO.${qibo.no}` : '', String(qibo.no ?? '')]),
      subtitle: [qibo.no != null ? `NO.${qibo.no}` : '', ...(qibo.elements ?? [])].filter(Boolean).join(' · '),
      text: uniqueJoin(collectStrings(qibo)),
      to: { name: 'qibo', query: { q: qibo.name } },
    })
  }

  return docs
}
