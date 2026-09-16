const BASE = String(import.meta.env.VITE_WIKI_API_URL || '/wiki-api').replace(/\/+$/, '')

export class WikiApiError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

async function request(path) {
  let res
  try {
    res = await fetch(`${BASE}${path}`, { headers: { Accept: 'application/json' } })
  } catch {
    throw new WikiApiError('OFFLINE', 'offline')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.ok === false) {
    throw new WikiApiError(data.code || 'FAIL', data.message || 'fail')
  }
  return data
}

export function searchWiki(query, { limit = 12 } = {}) {
  const q = String(query ?? '').trim()
  if (!q) return Promise.resolve([])
  return request(`/api/search?q=${encodeURIComponent(q)}&limit=${encodeURIComponent(limit)}`).then(
    (data) => data.results || [],
  )
}

export function fetchWikiNav() {
  return request('/api/nav')
}

export function fetchCharacters() {
  return request('/api/characters').then((data) => data.characters || [])
}

export function fetchCharacter(id) {
  return request(`/api/characters/${encodeURIComponent(id)}`).then((data) => data.character || null)
}

export function fetchQibos() {
  return request('/api/qibos').then((data) => data.qibos || [])
}

export function fetchQibo(id) {
  return request(`/api/qibos/${encodeURIComponent(id)}`).then((data) => ({
    qibo: data.qibo || null,
    prev: data.prev || null,
    next: data.next || null,
  }))
}

export function fetchItems() {
  return request('/api/items').then((data) => data.items || [])
}

export function fetchItem(id, { from } = {}) {
  const qs = from ? `?from=${encodeURIComponent(from)}` : ''
  return request(`/api/items/${encodeURIComponent(id)}${qs}`).then((data) => ({
    item: data.item || null,
    prev: data.prev || null,
    next: data.next || null,
  }))
}
