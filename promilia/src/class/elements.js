/**
 * 元素 / 调谐印记定义
 * 参考：https://wiki.biligame.com/ap/元素
 * 火、风、地、木、冰、水、雷、光、暗、无
 */

/** 展示顺序（与 wiki 元素表一致，无属性一般不作为调谐印记） */
export const ELEMENT_ORDER = [
  'huo',
  'feng',
  'di',
  'mu',
  'bing',
  'shui',
  'lei',
  'guang',
  'an',
]

export const ELEMENTS = {
  huo: {
    id: 'huo',
    name: '火',
    aliases: ['火', 'huo', 'fire'],
    /** 印记球主色 / 高光 */
    orb: { core: '#ff6a3d', glow: '#ffb087', highlight: '#ffe0c8' },
  },
  feng: {
    id: 'feng',
    name: '风',
    aliases: ['风', 'feng', 'wind'],
    orb: { core: '#e8a820', glow: '#f0c85a', highlight: '#fff0b8' },
  },
  di: {
    id: 'di',
    name: '地',
    aliases: ['地', 'di', 'earth'],
    orb: { core: '#c4a06a', glow: '#e0c49a', highlight: '#f5ead4' },
  },
  mu: {
    id: 'mu',
    name: '木',
    aliases: ['木', 'mu', 'wood'],
    orb: { core: '#4caf6a', glow: '#8fd99a', highlight: '#d4f5da' },
  },
  bing: {
    id: 'bing',
    name: '冰',
    aliases: ['冰', 'bing', 'ice'],
    orb: { core: '#7ec8e8', glow: '#b8e4f5', highlight: '#eef9ff' },
  },
  shui: {
    id: 'shui',
    name: '水',
    aliases: ['水', 'shui', 'water'],
    orb: { core: '#3d8cff', glow: '#7eb0ff', highlight: '#d4e6ff' },
  },
  lei: {
    id: 'lei',
    name: '雷',
    aliases: ['雷', 'lei', 'thunder', 'lightning'],
    orb: { core: '#6b5cff', glow: '#9b8cff', highlight: '#ddd6ff' },
  },
  guang: {
    id: 'guang',
    name: '光',
    aliases: ['光', 'guang', 'light'],
    orb: { core: '#f0e6a0', glow: '#fff6c8', highlight: '#fffef0' },
  },
  an: {
    id: 'an',
    name: '暗',
    aliases: ['暗', 'an', 'dark'],
    orb: { core: '#8b5cf6', glow: '#b794f6', highlight: '#e9d8fd' },
  },
  wu: {
    id: 'wu',
    name: '无',
    aliases: ['无', 'wu', 'none'],
    orb: { core: '#9aa3b2', glow: '#c5cad3', highlight: '#eef0f3' },
  },
}

const ALIAS_MAP = (() => {
  const map = Object.create(null)
  for (const el of Object.values(ELEMENTS)) {
    map[el.id] = el.id
    for (const a of el.aliases) {
      map[a] = el.id
      map[a.toLowerCase?.() ? a.toLowerCase() : a] = el.id
    }
  }
  return map
})()

/** 解析任意写法为标准元素 id；无法识别则返回 null */
export function resolveElementId(type) {
  if (type == null) return null
  const raw = String(type).trim()
  if (!raw) return null
  return ALIAS_MAP[raw] || ALIAS_MAP[raw.toLowerCase()] || null
}

export function getElement(type) {
  const id = resolveElementId(type)
  return id ? ELEMENTS[id] : null
}

/** 空印记表（各属性 0） */
export function createEmptyMarks(initial = {}) {
  const marks = {}
  for (const id of ELEMENT_ORDER) {
    marks[id] = 0
  }
  marks.wu = 0
  for (const [k, v] of Object.entries(initial)) {
    const id = resolveElementId(k)
    if (id) marks[id] = Number(v) || 0
  }
  return marks
}
