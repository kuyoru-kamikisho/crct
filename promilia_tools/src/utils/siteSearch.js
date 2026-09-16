import { searchWiki } from '@/api/wiki'

export { splitHighlight } from '@/utils/textHighlight'

/**
 * 站内模糊搜索：请求后端 search.db，避免首屏拉取全量图鉴 JS。
 * @param {string} query
 * @param {{ limit?: number }} [options]
 */
export function searchSite(query, { limit = 12 } = {}) {
  return searchWiki(query, { limit })
}
