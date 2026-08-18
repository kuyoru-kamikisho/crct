import Fuse from 'fuse.js'
import { buildSearchDocuments } from '@/data/searchIndex'
import zhCN from '@/i18n/locales/zh-CN'

const fuseOptions = {
  keys: [
    { name: 'title', weight: 3 },
    { name: 'aliases', weight: 2.4 },
    { name: 'subtitle', weight: 0.9 },
    { name: 'text', weight: 1 },
  ],
  threshold: 0.38,
  ignoreLocation: true,
  minMatchCharLength: 1,
  includeScore: true,
  ignoreDiacritics: true,
}

let documents = buildSearchDocuments([zhCN])
let fuse = new Fuse(documents, fuseOptions)

Promise.all([
  import('@/i18n/locales/en-US').then((m) => m.default),
  import('@/i18n/locales/ja-JP').then((m) => m.default),
]).then(([enUS, jaJP]) => {
  documents = buildSearchDocuments([zhCN, enUS, jaJP])
  fuse = new Fuse(documents, fuseOptions)
})

function normalize(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\s+/g, '')
}

function makeSnippet(doc, query) {
  const q = query.trim()
  const nq = normalize(q)
  if (!q) return doc.subtitle
  if (normalize(doc.title).includes(nq) || normalize(doc.aliases).includes(nq)) {
    return ''
  }

  const hay = doc.text || ''
  const idx = hay.toLowerCase().indexOf(q.toLowerCase())
  if (idx < 0) return doc.subtitle

  const start = Math.max(0, idx - 18)
  const end = Math.min(hay.length, idx + q.length + 36)
  let snippet = hay.slice(start, end).replace(/\s+/g, ' ').trim()
  if (start > 0) snippet = `…${snippet}`
  if (end < hay.length) snippet = `${snippet}…`
  return snippet
}

function addHit(map, doc, score) {
  const prev = map.get(doc.id)
  if (!prev || score > prev.score) map.set(doc.id, { doc, score })
}

/**
 * 站内模糊搜索：中文以包含/前缀为主，英文名等同时走 Fuse.js 容错。
 * @param {string} query
 * @param {{ limit?: number }} [options]
 */
export function searchSite(query, { limit = 12 } = {}) {
  const raw = String(query ?? '').trim()
  const nq = normalize(raw)
  if (!nq) return []

  const scored = new Map()

  for (const doc of documents) {
    const titleN = normalize(doc.title)
    const aliasN = normalize(doc.aliases)
    const subN = normalize(doc.subtitle)
    const textN = normalize(doc.text)

    if (titleN === nq || aliasN === nq) addHit(scored, doc, 400)
    else if (titleN.startsWith(nq) || aliasN.startsWith(nq)) addHit(scored, doc, 320)
    else if (titleN.includes(nq) || aliasN.includes(nq)) addHit(scored, doc, 260)
    else if (subN.includes(nq)) addHit(scored, doc, 180)
    else if (textN.includes(nq)) addHit(scored, doc, 120)
  }

  for (const hit of fuse.search(raw, { limit: limit * 3 })) {
    const fuzzy = Math.round((1 - (hit.score ?? 1)) * 100)
    if (fuzzy < 48) continue
    addHit(scored, hit.item, fuzzy)
  }

  return [...scored.values()]
    .sort((a, b) => b.score - a.score || a.doc.title.localeCompare(b.doc.title, 'zh-CN'))
    .slice(0, limit)
    .map(({ doc, score }) => ({
      ...doc,
      score,
      snippet: makeSnippet(doc, raw),
    }))
}

/**
 * 把匹配片段拆成高亮节点，避免 v-html。
 * @param {string} text
 * @param {string} query
 */
export function splitHighlight(text, query) {
  const source = String(text ?? '')
  const q = String(query ?? '').trim()
  if (!source) return []
  if (!q) return [{ text: source, hit: false }]

  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(escaped, 'ig')
  const parts = []
  let last = 0
  let match = re.exec(source)
  while (match) {
    if (match.index > last) parts.push({ text: source.slice(last, match.index), hit: false })
    parts.push({ text: match[0], hit: true })
    last = match.index + match[0].length
    if (match[0] === '') re.lastIndex += 1
    match = re.exec(source)
  }
  if (last < source.length) parts.push({ text: source.slice(last), hit: false })
  return parts.length ? parts : [{ text: source, hit: false }]
}
