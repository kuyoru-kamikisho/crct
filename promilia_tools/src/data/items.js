/**
 * 物品图鉴入口
 * 各物品数据拆分在 ./items/{id}.js，由 scripts/item-spider.js 从 BWiki 同步
 */
import {
  ALL_ITEMS_SOURCE_ID,
  buildItemSourceCatalog,
  classifyItemSources,
  getItemSourceById,
  itemBelongsToSource,
} from './itemSources'

const modules = import.meta.glob('./items/*.js', { eager: true, import: 'default' })

const byId = Object.fromEntries(
  Object.values(modules)
    .filter((item) => item?.id)
    .map((item) => [item.id, item]),
)

export const items = Object.values(byId).sort((a, b) => {
  const rarityDiff = Number(b.rarity || 0) - Number(a.rarity || 0)
  if (rarityDiff) return rarityDiff
  return String(a.name).localeCompare(String(b.name), 'zh-CN')
})

export const itemSourceCatalog = buildItemSourceCatalog(items)

export function getItemById(id) {
  return byId[id] || null
}

export function getItemSource(id) {
  return getItemSourceById(itemSourceCatalog, id)
}

export function getItemsBySource(sourceId) {
  if (!sourceId || sourceId === ALL_ITEMS_SOURCE_ID) return items
  return items.filter((item) => itemBelongsToSource(item, sourceId))
}

export function itemSourcesOf(item) {
  return classifyItemSources(item)
    .map((src) => getItemSource(src.id))
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

export function getItemFilterOptions(list = items) {
  return {
    rarity: uniqueValues(list.map((item) => item.rarity).filter((n) => Number(n) > 0)).sort((a, b) => b - a),
    types: sortByLocale(uniqueValues(list.flatMap((item) => item.types || []))),
    tags: sortByLocale(uniqueValues(list.flatMap((item) => item.tags || []))),
    ways: sortByLocale(uniqueValues(list.flatMap((item) => item.ways || []))),
  }
}

export { ALL_ITEMS_SOURCE_ID }
