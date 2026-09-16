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
