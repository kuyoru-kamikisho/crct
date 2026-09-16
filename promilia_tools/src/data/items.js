/**
 * 物品图鉴辅助函数。全量列表走 /api/items，详情走 /api/items/:id。
 */
import {
  ALL_ITEMS_SOURCE_ID,
  buildItemSourceCatalog,
  classifyItemSources,
  getItemSourceById,
  itemBelongsToSource,
} from './itemSources'

export function getItemById(list, id) {
  return list?.find((item) => item.id === id) || null
}

export function getItemSource(catalog, id) {
  return getItemSourceById(catalog, id)
}

export function getItemsBySource(list, sourceId) {
  if (!sourceId || sourceId === ALL_ITEMS_SOURCE_ID) return list
  return list.filter((item) => itemBelongsToSource(item, sourceId))
}

export function itemSourcesOf(item, catalog) {
  return classifyItemSources(item)
    .map((src) => getItemSourceById(catalog, src.id))
    .filter(Boolean)
}

function uniqueValues(list) {
  return [...new Set(list.filter((v) => v != null && String(v).length))]
}

function sortByLocale(list) {
  return [...list].sort((a, b) => String(a).localeCompare(String(b), 'zh-CN'))
}

export function createEmptyItemFilters() {
  return {
    rarity: [],
    types: [],
    tags: [],
    ways: [],
  }
}

export function countActiveItemFilters(filters) {
  return Object.values(filters || {}).reduce((sum, list) => sum + (list?.length || 0), 0)
}

export function matchItemFilters(item, filters) {
  if (!filters) return true
  if (filters.rarity?.length && !filters.rarity.includes(item.rarity)) return false
  if (filters.types?.length && !(item.types || []).some((type) => filters.types.includes(type))) return false
  if (filters.tags?.length && !(item.tags || []).some((tag) => filters.tags.includes(tag))) return false
  if (filters.ways?.length && !(item.ways || []).some((way) => filters.ways.includes(way))) return false
  return true
}

export function getItemFilterOptions(list = []) {
  return {
    rarity: uniqueValues(list.map((item) => item.rarity).filter((n) => Number(n) > 0)).sort((a, b) => b - a),
    types: sortByLocale(uniqueValues(list.flatMap((item) => item.types || []))),
    tags: sortByLocale(uniqueValues(list.flatMap((item) => item.tags || []))),
    ways: sortByLocale(uniqueValues(list.flatMap((item) => item.ways || []))),
  }
}

export { ALL_ITEMS_SOURCE_ID, buildItemSourceCatalog }
