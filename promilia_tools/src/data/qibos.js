/**
 * 奇波图鉴入口
 * 各奇波数据拆分在 ./qibos/{id}.js，由 scripts/kib-spider.js 从 BWiki 同步
 */
const modules = import.meta.glob('./qibos/*.js', { eager: true, import: 'default' })

const byId = Object.fromEntries(
  Object.values(modules)
    .filter((q) => q?.id)
    .map((q) => [q.id, q]),
)

function parseNoParts(no) {
  const s = String(no ?? '')
  const m = s.match(/^(\d+)([A-Za-z]*)$/)
  if (!m) return [Number.MAX_SAFE_INTEGER, s]
  return [Number(m[1]), m[2] || '']
}

export const qibos = Object.values(byId).sort((a, b) => {
  const [na, sa] = parseNoParts(a.no)
  const [nb, sb] = parseNoParts(b.no)
  if (na !== nb) return na - nb
  return sa.localeCompare(sb)
})

export function getQiboById(id) {
  return byId[id] || null
}
