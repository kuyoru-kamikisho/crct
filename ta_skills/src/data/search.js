import { articles } from './knowledge.js'
import { problems } from './problems.js'
import { interviews } from './interview.js'
import { toolGroups } from './tools.js'
import { communities } from './community.js'

export function buildSearchIndex() {
  const items = []

  for (const a of articles) {
    items.push({
      type: '知识',
      title: a.title,
      hint: a.summary,
      to: `/learn/${a.slug}`,
      keys: [a.title, a.summary, ...(a.keywords || [])].join(' ')
    })
  }

  for (const p of problems) {
    items.push({
      type: '问题',
      title: p.title,
      hint: p.summary,
      to: `/problems/${p.id}`,
      keys: [p.title, p.summary, ...(p.tags || [])].join(' ')
    })
  }

  interviews.forEach((it, i) => {
    items.push({
      type: '面试',
      title: it.q,
      hint: it.a.slice(0, 80) + '…',
      to: `/interview?q=${i}`,
      keys: [it.q, it.a, ...(it.tags || [])].join(' ')
    })
  })

  for (const g of toolGroups) {
    for (const t of g.items) {
      items.push({
        type: '工具',
        title: t.name,
        hint: t.desc,
        to: '/tools',
        keys: [t.name, t.desc, g.title].join(' ')
      })
    }
  }

  for (const c of communities) {
    items.push({
      type: '社区',
      title: c.name,
      hint: c.desc,
      to: '/community',
      keys: [c.name, c.desc, c.kind].join(' ')
    })
  }

  return items
}

export function searchItems(index, q) {
  const s = q.trim().toLowerCase()
  if (!s) return []
  const parts = s.split(/\s+/).filter(Boolean)
  return index
    .map((item) => {
      const hay = (item.keys + ' ' + item.title).toLowerCase()
      let score = 0
      if (item.title.toLowerCase().includes(s)) score += 8
      for (const p of parts) {
        if (!hay.includes(p)) return null
        score += 1
      }
      return { ...item, score }
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
}
