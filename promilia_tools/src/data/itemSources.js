/**
 * 按 wiki【获取途径】把物品归入侧栏分类。
 * 商店保留店名；家园工台、渔场、探索等相近途径合并，避免侧栏过长。
 */
export const ALL_ITEMS_SOURCE_ID = 'items'
export const ALL_ITEMS_SOURCE_NAME = '物品图鉴'

const HOME_STATIONS = [
  { id: 'home-cuisine', name: '家园料理', icon: 'food', match: /家园[-·]?(料理铺|烹饪锅)/ },
  { id: 'home-workshop', name: '家园工坊', icon: 'workshop', match: /家园[-·]?(工作室|工作台)/ },
  { id: 'home-textile', name: '家园纺织', icon: 'textile', match: /家园[-·]?(纺车|纺织铺)/ },
  { id: 'home-mill', name: '家园磨坊', icon: 'mill', match: /家园[-·]?磨坊/ },
  { id: 'home-ranch', name: '家园牧场', icon: 'ranch', match: /家园牧场/ },
  { id: 'home-farm', name: '家园种植', icon: 'farm', match: /^家园种植/ },
  { id: 'home-smelt', name: '家园熔炼', icon: 'workshop', match: /家园[-·]?(熔炼铺|熔炉)/ },
  { id: 'home-alchemy', name: '家园炼金', icon: 'workshop', match: /家园[-·]?(炼金台|共鸣石台)/ },
  { id: 'home-brick', name: '家园制砖', icon: 'workshop', match: /家园[-·]?(制砖铺|砖窑)/ },
  { id: 'home-sawmill', name: '家园锯木', icon: 'workshop', match: /家园[-·]?(锯木铺|锯木台)/ },
  { id: 'home-leather', name: '家园制革', icon: 'workshop', match: /家园[-·]?(制革铺|制革台)/ },
]

export function slugifySourceId(name) {
  const s = String(name || '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[\\/?#&%=]+/g, '')
    .replace(/^-+|-+$/g, '')
  return s || 'source'
}

/**
 * 把 wiki 里一条【获取途径】归并到侧栏分类。
 * 商店名去掉「购买」；渔场/钓鱼合并；牵绊/探索等长尾途径合并，避免侧栏爆炸。
 */
export function classifyWay(raw) {
  const way = String(raw || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!way) return null

  if (/购买$/.test(way)) {
    const name = way.replace(/购买$/, '').trim()
    if (name) {
      return { id: slugifySourceId(name), name, icon: 'shop', rank: 10, way }
    }
  }

  for (const rule of HOME_STATIONS) {
    if (rule.match.test(way)) {
      return { id: rule.id, name: rule.name, icon: rule.icon, rank: 20, way }
    }
  }

  if (/^渔场/.test(way) || way.includes('钓鱼') || way.includes('加工鱼类')) {
    return { id: 'fishing', name: '钓鱼', icon: 'fish', rank: 30, way }
  }
  if (way.includes('采集')) {
    return { id: 'gathering', name: '区域采集', icon: 'leaf', rank: 31, way }
  }
  if (way.includes('探索')) {
    return { id: 'exploration', name: '地区探索', icon: 'compass', rank: 32, way }
  }
  if (way.includes('牵绊')) {
    return { id: 'bond', name: '牵绊奖励', icon: 'heart', rank: 40, way }
  }
  if (way.includes('星赐合成')) {
    return { id: 'star-gift', name: '星赐合成', icon: 'star', rank: 41, way }
  }
  if (way.includes('地区委托')) {
    return { id: 'region-quest', name: '地区委托', icon: 'quest', rank: 42, way }
  }
  if (way.includes('元素祭坛')) {
    return { id: 'element-altar', name: '元素祭坛', icon: 'star', rank: 43, way }
  }
  if (way.includes('狩猎场')) {
    return { id: 'hunting', name: '狩猎场', icon: 'leaf', rank: 33, way }
  }
  if (way.includes('采矿场') || way.includes('采石场')) {
    return { id: 'mining', name: '采矿', icon: 'workshop', rank: 34, way }
  }
  if (way.includes('伐木场')) {
    return { id: 'logging', name: '伐木', icon: 'leaf', rank: 35, way }
  }
  if (way.includes('奇波掉落') || way.includes('放生奇波')) {
    return { id: 'qibo-drop', name: '奇波掉落', icon: 'other', rank: 44, way }
  }
  if (way.includes('心得熟练度')) {
    return { id: 'proficiency', name: '熟练度奖励', icon: 'quest', rank: 45, way }
  }
  if (way.includes('活跃')) {
    return { id: 'activity', name: '活跃奖励', icon: 'quest', rank: 46, way }
  }

  return { id: 'other', name: '其他获取', icon: 'other', rank: 55, way }
}

export function classifyItemSources(item) {
  const seen = new Set()
  const list = []
  for (const way of item?.ways || []) {
    const src = classifyWay(way)
    if (!src || seen.has(src.id)) continue
    seen.add(src.id)
    list.push(src)
  }
  return list
}

export function itemBelongsToSource(item, sourceId) {
  if (!sourceId || sourceId === ALL_ITEMS_SOURCE_ID) return true
  return classifyItemSources(item).some((src) => src.id === sourceId)
}

export function buildItemSourceCatalog(itemList = []) {
  const map = new Map()
  map.set(ALL_ITEMS_SOURCE_ID, {
    id: ALL_ITEMS_SOURCE_ID,
    name: ALL_ITEMS_SOURCE_NAME,
    icon: 'bag',
    rank: 0,
    kind: 'all',
    path: '/encyclopedia/items',
    ways: [],
    count: itemList.length,
  })

  for (const item of itemList) {
    for (const src of classifyItemSources(item)) {
      const prev = map.get(src.id)
      if (prev) {
        prev.count += 1
        if (src.way && !prev.ways.includes(src.way)) prev.ways.push(src.way)
        continue
      }
      map.set(src.id, {
        id: src.id,
        name: src.name,
        icon: src.icon,
        rank: src.rank,
        kind: 'source',
        path: `/encyclopedia/obtain/${src.id}`,
        ways: src.way ? [src.way] : [],
        count: 1,
      })
    }
  }

  return [...map.values()].sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank
    if (b.count !== a.count) return b.count - a.count
    return String(a.name).localeCompare(String(b.name), 'zh-CN')
  })
}

export function getItemSourceById(catalog, id) {
  return catalog.find((src) => src.id === id) || null
}
