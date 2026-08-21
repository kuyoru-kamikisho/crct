import {
  mdiAccountStar,
  mdiAutoFix,
  mdiBagPersonal,
  mdiBarn,
  mdiBookAccount,
  mdiBookOpenOutline,
  mdiBookOpenPageVariant,
  mdiBookOpenVariant,
  mdiCalculatorVariant,
  mdiCalendarStar,
  mdiCardsPlayingOutline,
  mdiClipboardTextOutline,
  mdiCompass,
  mdiCow,
  mdiFish,
  mdiFood,
  mdiGamepadVariant,
  mdiGrain,
  mdiHammerWrench,
  mdiHandHeartOutline,
  mdiHeartOutline,
  mdiLeaf,
  mdiMapOutline,
  mdiPaw,
  mdiPawOutline,
  mdiPuzzleOutline,
  mdiScriptTextOutline,
  mdiSprout,
  mdiStorefrontOutline,
  mdiTagOutline,
  mdiTrophyOutline,
  mdiTshirtCrew,
} from '@mdi/js'
import { ALL_ITEMS_SOURCE_ID, itemSourceCatalog } from '@/data/items'

const SOURCE_ICONS = {
  bag: mdiBagPersonal,
  shop: mdiStorefrontOutline,
  food: mdiFood,
  workshop: mdiHammerWrench,
  textile: mdiTshirtCrew,
  mill: mdiGrain,
  ranch: mdiCow,
  farm: mdiSprout,
  fish: mdiFish,
  leaf: mdiLeaf,
  compass: mdiCompass,
  heart: mdiHeartOutline,
  star: mdiAutoFix,
  quest: mdiClipboardTextOutline,
  other: mdiBagPersonal,
}

function itemNavChildren() {
  return itemSourceCatalog.map((src) => ({
    id: `item-${src.id}`,
    label: src.name,
    labelKey: src.id === ALL_ITEMS_SOURCE_ID ? 'nav.items' : undefined,
    path: src.path,
    icon: SOURCE_ICONS[src.icon] || mdiBagPersonal,
  }))
}

/**
 * 侧栏导航结构 —— 子模块可随时扩充
 */
export const navSections = [
  {
    id: 'encyclopedia',
    labelKey: 'nav.encyclopedia',
    icon: mdiBookOpenPageVariant,
    children: [
      { id: 'characters', labelKey: 'nav.characters', path: '/encyclopedia/characters', icon: mdiAccountStar },
      { id: 'qibo', labelKey: 'nav.qibo', path: '/encyclopedia/qibo', icon: mdiPaw },
      ...itemNavChildren(),
      { id: 'achievements', labelKey: 'nav.achievements', path: '/encyclopedia/achievements', icon: mdiTrophyOutline },
      { id: 'affixes', labelKey: 'nav.affixes', path: '/encyclopedia/affixes', icon: mdiTagOutline },
    ],
  },
  {
    id: 'guides',
    labelKey: 'nav.guides',
    icon: mdiCompass,
    children: [
      { id: 'guide-character', labelKey: 'nav.guideCharacter', path: '/guides/character', icon: mdiBookAccount },
      { id: 'guide-qibo', labelKey: 'nav.guideQibo', path: '/guides/qibo', icon: mdiPawOutline },
      { id: 'guide-farm', labelKey: 'nav.guideFarm', path: '/guides/farm', icon: mdiBarn },
      { id: 'guide-puzzle', labelKey: 'nav.guidePuzzle', path: '/guides/puzzle', icon: mdiPuzzleOutline },
      { id: 'guide-event', labelKey: 'nav.guideEvent', path: '/guides/event', icon: mdiCalendarStar },
    ],
  },
  {
    id: 'story',
    labelKey: 'nav.story',
    icon: mdiScriptTextOutline,
    children: [
      { id: 'story-main', labelKey: 'nav.storyMain', path: '/story/main', icon: mdiBookOpenVariant },
      { id: 'story-side', labelKey: 'nav.storySide', path: '/story/side', icon: mdiBookOpenOutline },
    ],
  },
  {
    id: 'tools',
    labelKey: 'nav.tools',
    icon: mdiGamepadVariant,
    children: [
      { id: 'gacha', labelKey: 'nav.gacha', path: '/tools/gacha', icon: mdiCardsPlayingOutline },
      { id: 'team-calc', labelKey: 'nav.teamCalc', path: '/tools/team', icon: mdiCalculatorVariant },
      { id: 'map-tool', labelKey: 'nav.mapTool', path: '/tools/map', icon: mdiMapOutline },
    ],
  },
  {
    id: 'contribute',
    labelKey: 'nav.contribute',
    icon: mdiHandHeartOutline,
    children: [{ id: 'contribute', labelKey: 'nav.contribute', path: '/contribute', icon: mdiHeartOutline }],
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
