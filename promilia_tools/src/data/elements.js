import {
  mdiAllInclusive,
  mdiFire,
  mdiHelpCircleOutline,
  mdiLightningBolt,
  mdiMoonWaningCrescent,
  mdiSnowflake,
  mdiSprout,
  mdiTriangle,
  mdiWater,
  mdiWeatherWindy,
  mdiWhiteBalanceSunny,
} from '@mdi/js'

/** 元素圆形图标配色，对齐图鉴例图 */
export const ELEMENT_VISUALS = {
  火: { color: '#F56C6C', icon: mdiFire },
  风: { color: '#FF8A3D', icon: mdiWeatherWindy },
  地: { color: '#DAA520', icon: mdiTriangle },
  木: { color: '#67C23A', icon: mdiSprout },
  冰: { color: '#40E0D0', icon: mdiSnowflake },
  水: { color: '#409EFF', icon: mdiWater },
  雷: { color: '#5C6BC0', icon: mdiLightningBolt },
  光: { color: '#F7E34B', icon: mdiWhiteBalanceSunny },
  暗: { color: '#9C27B0', icon: mdiMoonWaningCrescent },
  无: { color: '#A3C1DA', icon: mdiAllInclusive },
}

const FALLBACK = { color: '#8aa8a8', icon: mdiHelpCircleOutline }

export function getElementVisual(name) {
  return ELEMENT_VISUALS[name] ?? FALLBACK
}
