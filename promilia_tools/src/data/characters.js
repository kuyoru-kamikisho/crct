/**
 * 角色图鉴辅助函数。全量列表走 /api/characters，详情走 /api/characters/:id。
 */

const ELEMENT_ORDER = ['火', '风', '地', '木', '冰', '水', '雷', '光', '暗', '无']

function uniqueValues(list) {
  return [...new Set(list.filter((v) => v != null && String(v).length))]
}

function sortByLocale(list) {
  return [...list].sort((a, b) => String(a).localeCompare(String(b), 'zh-CN'))
}

function sortElements(list) {
  return [...list].sort((a, b) => {
    const ia = ELEMENT_ORDER.indexOf(a)
    const ib = ELEMENT_ORDER.indexOf(b)
    if (ia === -1 && ib === -1) return String(a).localeCompare(String(b), 'zh-CN')
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })
}

export function getCharacterById(list, id) {
  return list?.find((item) => item.id === id) || null
}

/** 从角色数据动态收集筛选项，数据变更后过滤条件会同步增减 */
export function getCharacterFilterOptions(characters = []) {
  return {
    rarity: uniqueValues(characters.map((c) => c.rarity)).sort((a, b) => b - a),
    elements: sortElements(uniqueValues(characters.flatMap((c) => c.elements ?? []))),
    profession: sortByLocale(uniqueValues(characters.map((c) => c.profession))),
    faction: sortByLocale(uniqueValues(characters.map((c) => c.faction))),
    race: sortByLocale(uniqueValues(characters.map((c) => c.race))),
    weapon: sortByLocale(uniqueValues(characters.map((c) => c.weapon))),
  }
}

export function createEmptyCharacterFilters() {
  return {
    rarity: [],
    elements: [],
    profession: [],
    faction: [],
    race: [],
    weapon: [],
  }
}

export function matchCharacterFilters(character, filters) {
  if (filters.rarity.length && !filters.rarity.includes(character.rarity)) return false
  if (filters.elements.length && !character.elements?.some((el) => filters.elements.includes(el))) {
    return false
  }
  if (filters.profession.length && !filters.profession.includes(character.profession)) return false
  if (filters.faction.length && !filters.faction.includes(character.faction)) return false
  if (filters.race.length && !filters.race.includes(character.race)) return false
  if (filters.weapon.length && !filters.weapon.includes(character.weapon)) return false
  return true
}

export function countActiveCharacterFilters(filters) {
  return Object.values(filters).reduce((n, list) => n + (list?.length ?? 0), 0)
}
