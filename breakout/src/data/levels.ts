import type { BrickKind, LevelDef, PowerUpKind } from '../types/game'

const N: BrickKind = 'normal'
const A: BrickKind = 'armored'
const E: BrickKind = 'explosive'
const G: BrickKind = 'ghost'
const C: BrickKind = 'crystal'
const P: BrickKind = 'portal'
const _: null = null

export const POWER_META: Record<
  PowerUpKind,
  { label: string; color: string; desc: string }
> = {
  multi: { label: '裂球', color: '#38BDF8', desc: '分裂出额外光球' },
  laser: { label: '光刃', color: '#FB7185', desc: '挡板发射激光' },
  sticky: { label: '黏附', color: '#A3E635', desc: '球会短暂黏在板上' },
  expand: { label: '延展', color: '#2DD4BF', desc: '挡板变宽' },
  shrink: { label: '收缩', color: '#F97316', desc: '挡板变窄' },
  warp: { label: '时缓', color: '#C084FC', desc: '短暂减速世界' },
  shield: { label: '护幕', color: '#FDE68A', desc: '底部出现护盾' },
  magnet: { label: '磁引', color: '#67E8F9', desc: '球略微被板吸引' },
}

export const LEVELS: LevelDef[] = [
  {
    id: 1,
    name: '初光浅滩',
    subtitle: '熟悉节奏，打碎第一片潮光',
    rows: 5,
    cols: 10,
    theme: {
      sky: ['#082528', '#0F3D42'],
      brickPalette: ['#2DD4BF', '#5EEAD4', '#99F6E4', '#14B8A6', '#0D9488'],
      ambient: 'teal',
    },
    layout: [
      [N, N, N, N, N, N, N, N, N, N],
      [N, N, N, N, N, N, N, N, N, N],
      [N, N, C, N, N, N, N, C, N, N],
      [N, N, N, N, N, N, N, N, N, N],
      [N, N, N, N, N, N, N, N, N, N],
    ],
  },
  {
    id: 2,
    name: '潮门拱廊',
    subtitle: '拱形阵列，注意缺口节奏',
    rows: 6,
    cols: 11,
    theme: {
      sky: ['#0A1F2E', '#123A4A'],
      brickPalette: ['#38BDF8', '#7DD3FC', '#0EA5E9', '#0284C7', '#67E8F9'],
      ambient: 'sky',
    },
    layout: [
      [_, _, N, N, N, N, N, N, N, _, _],
      [_, N, N, N, N, C, N, N, N, N, _],
      [N, N, N, N, N, N, N, N, N, N, N],
      [N, N, A, N, N, N, N, N, A, N, N],
      [_, N, N, N, N, N, N, N, N, N, _],
      [_, _, N, N, _, _, _, N, N, _, _],
    ],
  },
  {
    id: 3,
    name: '棱镜花园',
    subtitle: '水晶与幽灵交织，分数翻涌',
    rows: 6,
    cols: 10,
    theme: {
      sky: ['#1A1230', '#2A1B45'],
      brickPalette: ['#F472B6', '#FB7185', '#F9A8D4', '#E879F9', '#C084FC'],
      ambient: 'rose',
    },
    layout: [
      [C, N, G, N, C, C, N, G, N, C],
      [N, N, N, N, N, N, N, N, N, N],
      [G, N, C, N, G, G, N, C, N, G],
      [N, A, N, N, N, N, N, N, A, N],
      [N, N, N, C, N, N, C, N, N, N],
      [N, N, N, N, N, N, N, N, N, N],
    ],
  },
  {
    id: 4,
    name: '脉冲廊道',
    subtitle: '装甲夹道，爆炸可破局',
    rows: 7,
    cols: 11,
    theme: {
      sky: ['#1C1408', '#3A2410'],
      brickPalette: ['#FBBF24', '#F59E0B', '#FDE68A', '#EA580C', '#FB923C'],
      ambient: 'amber',
    },
    layout: [
      [A, A, A, A, A, E, A, A, A, A, A],
      [N, N, N, N, N, N, N, N, N, N, N],
      [A, _, N, N, N, C, N, N, N, _, A],
      [A, _, N, E, N, N, N, E, N, _, A],
      [A, _, N, N, N, N, N, N, N, _, A],
      [N, N, N, N, A, A, A, N, N, N, N],
      [_, _, N, N, N, N, N, N, N, _, _],
    ],
  },
  {
    id: 5,
    name: '星云蜂巢',
    subtitle: '蜂窝结构，连锁爆炸的舞台',
    rows: 7,
    cols: 12,
    theme: {
      sky: ['#071A14', '#0F2F24'],
      brickPalette: ['#A3E635', '#84CC16', '#BEF264', '#65A30D', '#4ADE80'],
      ambient: 'lime',
    },
    layout: [
      [_, N, N, _, N, N, N, N, _, N, N, _],
      [N, E, N, N, N, C, C, N, N, N, E, N],
      [N, N, N, E, N, N, N, N, E, N, N, N],
      [_, N, A, N, N, E, E, N, N, A, N, _],
      [N, N, N, N, N, N, N, N, N, N, N, N],
      [N, G, N, N, C, N, N, C, N, N, G, N],
      [_, _, N, N, N, N, N, N, N, N, _, _],
    ],
  },
  {
    id: 6,
    name: '镜渊回廊',
    subtitle: '传送砖改写轨迹，小心失球',
    rows: 7,
    cols: 11,
    theme: {
      sky: ['#061820', '#0C2E3A'],
      brickPalette: ['#22D3EE', '#06B6D4', '#67E8F9', '#0891B2', '#A5F3FC'],
      ambient: 'cyan',
    },
    layout: [
      [P, N, N, N, N, A, N, N, N, N, P],
      [N, N, C, N, N, N, N, N, C, N, N],
      [N, A, N, N, P, N, P, N, N, A, N],
      [N, N, N, N, N, C, N, N, N, N, N],
      [G, N, N, E, N, N, N, E, N, N, G],
      [N, N, N, N, N, N, N, N, N, N, N],
      [_, P, N, N, N, N, N, N, N, P, _],
    ],
  },
  {
    id: 7,
    name: '日轮晶格',
    subtitle: '密集装甲，激光与爆炸是救星',
    rows: 8,
    cols: 12,
    theme: {
      sky: ['#2A1208', '#4A1F0C'],
      brickPalette: ['#FB923C', '#F97316', '#FDBA74', '#EA580C', '#FDE68A'],
      ambient: 'ember',
    },
    layout: [
      [A, A, A, A, A, A, A, A, A, A, A, A],
      [A, C, N, N, N, E, E, N, N, N, C, A],
      [A, N, A, N, N, N, N, N, N, A, N, A],
      [N, N, N, A, N, C, C, N, A, N, N, N],
      [N, E, N, N, A, N, N, A, N, N, E, N],
      [N, N, N, N, N, A, A, N, N, N, N, N],
      [G, N, N, C, N, N, N, N, C, N, N, G],
      [_, _, N, N, N, N, N, N, N, N, _, _],
    ],
  },
  {
    id: 8,
    name: '极光核心',
    subtitle: '终局：护住核心，击碎整座光阵',
    rows: 8,
    cols: 13,
    theme: {
      sky: ['#04151C', '#0A2A33'],
      brickPalette: ['#2DD4BF', '#FBBF24', '#FB7185', '#38BDF8', '#A3E635'],
      ambient: 'aurora',
    },
    unlockHint: '通关全部前序关卡解锁',
    layout: [
      [C, N, N, A, N, N, C, N, N, A, N, N, C],
      [N, P, N, N, E, N, N, N, E, N, N, P, N],
      [N, N, A, N, N, G, A, G, N, N, A, N, N],
      [A, N, N, C, N, N, E, N, N, C, N, N, A],
      [N, E, N, N, A, N, C, N, A, N, N, E, N],
      [N, N, G, N, N, P, N, P, N, N, G, N, N],
      [N, N, N, A, N, N, A, N, N, A, N, N, N],
      [_, _, C, N, N, N, C, N, N, N, C, _, _],
    ],
  },
]

export function brickHp(kind: BrickKind): number {
  switch (kind) {
    case 'armored':
      return 3
    case 'ghost':
      return 2
    case 'crystal':
      return 1
    case 'explosive':
      return 1
    case 'portal':
      return 2
    default:
      return 1
  }
}

export function brickScore(kind: BrickKind): number {
  switch (kind) {
    case 'armored':
      return 30
    case 'ghost':
      return 40
    case 'crystal':
      return 80
    case 'explosive':
      return 50
    case 'portal':
      return 45
    default:
      return 20
  }
}
