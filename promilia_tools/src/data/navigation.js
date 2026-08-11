/**
 * 侧栏导航结构 —— 子模块可随时扩充
 */
export const navSections = [
  {
    id: 'encyclopedia',
    labelKey: 'nav.encyclopedia',
    icon: 'book',
    children: [
      { id: 'characters', labelKey: 'nav.characters', path: '/encyclopedia/characters' },
      { id: 'qibo', labelKey: 'nav.qibo', path: '/encyclopedia/qibo' },
      { id: 'gatherables', labelKey: 'nav.gatherables', path: '/encyclopedia/gatherables' },
      { id: 'goods', labelKey: 'nav.goods', path: '/encyclopedia/goods' },
      { id: 'spirit', labelKey: 'nav.spirit', path: '/encyclopedia/spirit' },
      { id: 'equipment', labelKey: 'nav.equipment', path: '/encyclopedia/equipment' },
      { id: 'items', labelKey: 'nav.items', path: '/encyclopedia/items' },
      { id: 'cuisine', labelKey: 'nav.cuisine', path: '/encyclopedia/cuisine' },
      { id: 'achievements', labelKey: 'nav.achievements', path: '/encyclopedia/achievements' },
      { id: 'affixes', labelKey: 'nav.affixes', path: '/encyclopedia/affixes' },
    ],
  },
  {
    id: 'guides',
    labelKey: 'nav.guides',
    icon: 'compass',
    children: [
      { id: 'guide-character', labelKey: 'nav.guideCharacter', path: '/guides/character' },
      { id: 'guide-qibo', labelKey: 'nav.guideQibo', path: '/guides/qibo' },
      { id: 'guide-farm', labelKey: 'nav.guideFarm', path: '/guides/farm' },
      { id: 'guide-puzzle', labelKey: 'nav.guidePuzzle', path: '/guides/puzzle' },
      { id: 'guide-event', labelKey: 'nav.guideEvent', path: '/guides/event' },
    ],
  },
  {
    id: 'story',
    labelKey: 'nav.story',
    icon: 'scroll',
    children: [
      { id: 'story-main', labelKey: 'nav.storyMain', path: '/story/main' },
      { id: 'story-side', labelKey: 'nav.storySide', path: '/story/side' },
    ],
  },
  {
    id: 'tools',
    labelKey: 'nav.tools',
    icon: 'spark',
    children: [
      { id: 'gacha', labelKey: 'nav.gacha', path: '/tools/gacha' },
      { id: 'team-calc', labelKey: 'nav.teamCalc', path: '/tools/team' },
      { id: 'map-tool', labelKey: 'nav.mapTool', path: '/tools/map' },
    ],
  },
  {
    id: 'contribute',
    labelKey: 'nav.contribute',
    icon: 'heart',
    children: [{ id: 'contribute', labelKey: 'nav.contribute', path: '/contribute' }],
  },
]

export const footerLinks = [
  {
    key: 'footer.officialWiki',
    href: 'https://wiki.biligame.com/ap/%E9%A6%96%E9%A1%B5',
  },
  {
    key: 'footer.weibo',
    href: 'https://weibo.com/u/7832445927',
  },
  {
    key: 'footer.bilibili',
    href: 'https://space.bilibili.com/3546864192345022',
  },
]
