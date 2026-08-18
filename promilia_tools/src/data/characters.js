/**
 * 角色图鉴入口
 * 各角色数据拆分在 ./characters/{id}.js，新增角色只需添加文件即可自动收录
 */
const modules = import.meta.glob('./characters/*.js', { eager: true, import: 'default' })

const byId = Object.fromEntries(
  Object.values(modules)
    .filter((c) => c?.id)
    .map((c) => [c.id, c]),
)

/** 列表展示顺序；未登记的新角色会按名称追加在末尾 */
const CHARACTER_ORDER = [
  'moyin',
  'lily',
  'luoqing',
  'metsa',
  'shalle-ensys',
  'pengpeng',
  'abby',
  'tushan-xiaoyu',
  'symphoria-tarandelion',
  'ruby',
  'minamoto-chiyo',
  'luruka',
  'kataru',
  'cathbelle',
  'agnes',
  'faridah',
  'hanyouyou',
  'terara',
  'mitty',
  'nono',
  'starborn',
]

const ordered = CHARACTER_ORDER.map((id) => byId[id]).filter(Boolean)
const extras = Object.values(byId)
  .filter((c) => !CHARACTER_ORDER.includes(c.id))
  .sort((a, b) => String(a.name).localeCompare(String(b.name), 'zh-CN'))

export const characters = [...ordered, ...extras]

export function getCharacterById(id) {
  return byId[id] || null
}

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

/** 从角色数据动态收集筛选项，数据变更后过滤条件会同步增减 */
export function getCharacterFilterOptions() {
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
