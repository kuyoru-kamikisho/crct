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
