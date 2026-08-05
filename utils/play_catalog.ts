/**
 * 小游戏图鉴：鱼类 / 农作物
 * 主题贴合木灵朵（森林、花蕊、竖琴、木元素）
 */

export type FishRarity = 'junk' | 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type FishDef = {
  id: string;
  name: string;
  /** 抽取权重，越大越常见 */
  weight: number;
  /** 出售单价（灵瓣） */
  price: number;
  rarity: FishRarity;
};

export type CropDef = {
  id: string;
  name: string;
  seedCost: number;
  growMs: number;
  harvestId: string;
  harvestN: number;
  /** 单件售价 */
  sell: number;
  /** 种植指令可用的别名（含主名） */
  aliases: readonly string[];
};

export const RARITY_LABEL: Record<FishRarity, string> = {
  junk: '杂物',
  common: '普通',
  uncommon: '少见',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
};

export const RARITY_MARK: Record<FishRarity, string> = {
  junk: '',
  common: '',
  uncommon: '◇',
  rare: '✨',
  epic: '✨✨',
  legendary: '🌟',
};

/** 鱼类图鉴（权重总和约 400） */
export const FISH_TABLE: readonly FishDef[] = [
  // —— 杂物 ——
  { id: 'fish_weed', name: '水草', weight: 22, price: 1, rarity: 'junk' },
  { id: 'fish_boot', name: '破靴子', weight: 10, price: 0, rarity: 'junk' },
  { id: 'fish_can', name: '空罐子', weight: 9, price: 0, rarity: 'junk' },
  { id: 'fish_stick', name: '枯枝', weight: 8, price: 1, rarity: 'junk' },
  { id: 'fish_hook', name: '生锈鱼钩', weight: 7, price: 2, rarity: 'junk' },
  { id: 'fish_shell', name: '碎贝壳', weight: 6, price: 2, rarity: 'junk' },

  // —— 普通 ——
  { id: 'fish_small', name: '小银鱼', weight: 30, price: 3, rarity: 'common' },
  { id: 'fish_loach', name: '泥鳅', weight: 24, price: 4, rarity: 'common' },
  { id: 'fish_shrimp', name: '河虾', weight: 22, price: 4, rarity: 'common' },
  { id: 'fish_grass', name: '草鱼', weight: 20, price: 5, rarity: 'common' },
  { id: 'fish_crucian', name: '鲫鱼', weight: 18, price: 5, rarity: 'common' },
  { id: 'fish_bleak', name: '白条', weight: 16, price: 4, rarity: 'common' },
  { id: 'fish_snail', name: '田螺', weight: 14, price: 3, rarity: 'common' },
  { id: 'fish_crab', name: '小河蟹', weight: 12, price: 6, rarity: 'common' },

  // —— 少见 ——
  { id: 'fish_carp', name: '锦鲤', weight: 14, price: 10, rarity: 'uncommon' },
  { id: 'fish_cat', name: '猫鱼', weight: 12, price: 12, rarity: 'uncommon' },
  { id: 'fish_bass', name: '鲈鱼', weight: 11, price: 11, rarity: 'uncommon' },
  { id: 'fish_trout', name: '虹鳟', weight: 10, price: 13, rarity: 'uncommon' },
  { id: 'fish_eel', name: '黄鳝', weight: 9, price: 12, rarity: 'uncommon' },
  { id: 'fish_koi_ink', name: '墨纹鲤', weight: 8, price: 14, rarity: 'uncommon' },
  { id: 'fish_petal', name: '花瓣鱼', weight: 7, price: 15, rarity: 'uncommon' },

  // —— 稀有 ——
  { id: 'fish_wood', name: '木灵鱼', weight: 6, price: 22, rarity: 'rare' },
  { id: 'fish_harp', name: '竖琴鲈', weight: 5, price: 28, rarity: 'rare' },
  { id: 'fish_leaf', name: '翠叶鳗', weight: 4, price: 26, rarity: 'rare' },
  { id: 'fish_dew', name: '朝露银鳞', weight: 4, price: 30, rarity: 'rare' },
  { id: 'fish_vine', name: '藤蔓鱼', weight: 3, price: 32, rarity: 'rare' },
  { id: 'fish_blossom', name: '花蕊灯鱼', weight: 3, price: 34, rarity: 'rare' },

  // —— 史诗 ——
  { id: 'fish_legend', name: '星原金鳞', weight: 2, price: 70, rarity: 'epic' },
  { id: 'fish_dragon', name: '藤蔓龙鱼', weight: 2, price: 75, rarity: 'epic' },
  { id: 'fish_dusk', name: '暮光锦鲤', weight: 1.5, price: 80, rarity: 'epic' },
  { id: 'fish_aurora', name: '林间极光鱼', weight: 1.5, price: 85, rarity: 'epic' },

  // —— 传说 ——
  { id: 'fish_myth', name: '旅谣神鱼', weight: 0.8, price: 140, rarity: 'legendary' },
  { id: 'fish_hymn', name: '木灵圣音', weight: 0.5, price: 180, rarity: 'legendary' },
];

/** 唯一作物定义（按 id） */
export const CROP_LIST: readonly CropDef[] = [
  {
    id: 'wheat',
    name: '小麦',
    seedCost: 5,
    growMs: 2 * 60_000,
    harvestId: 'crop_wheat',
    harvestN: 3,
    sell: 3,
    aliases: ['小麦'],
  },
  {
    id: 'potato',
    name: '土豆',
    seedCost: 6,
    growMs: 2.5 * 60_000,
    harvestId: 'crop_potato',
    harvestN: 3,
    sell: 3,
    aliases: ['土豆', '马铃薯'],
  },
  {
    id: 'carrot',
    name: '萝卜',
    seedCost: 8,
    growMs: 3 * 60_000,
    harvestId: 'crop_carrot',
    harvestN: 2,
    sell: 6,
    aliases: ['萝卜'],
  },
  {
    id: 'cabbage',
    name: '白菜',
    seedCost: 7,
    growMs: 3 * 60_000,
    harvestId: 'crop_cabbage',
    harvestN: 2,
    sell: 5,
    aliases: ['白菜'],
  },
  {
    id: 'corn',
    name: '玉米',
    seedCost: 9,
    growMs: 3.5 * 60_000,
    harvestId: 'crop_corn',
    harvestN: 2,
    sell: 7,
    aliases: ['玉米'],
  },
  {
    id: 'tomato',
    name: '番茄',
    seedCost: 10,
    growMs: 4 * 60_000,
    harvestId: 'crop_tomato',
    harvestN: 3,
    sell: 5,
    aliases: ['番茄', '西红柿'],
  },
  {
    id: 'strawberry',
    name: '草莓',
    seedCost: 12,
    growMs: 4 * 60_000,
    harvestId: 'crop_strawberry',
    harvestN: 4,
    sell: 5,
    aliases: ['草莓'],
  },
  {
    id: 'blueberry',
    name: '蓝莓',
    seedCost: 14,
    growMs: 4.5 * 60_000,
    harvestId: 'crop_blueberry',
    harvestN: 4,
    sell: 6,
    aliases: ['蓝莓'],
  },
  {
    id: 'grape',
    name: '葡萄',
    seedCost: 15,
    growMs: 5 * 60_000,
    harvestId: 'crop_grape',
    harvestN: 3,
    sell: 8,
    aliases: ['葡萄'],
  },
  {
    id: 'flower',
    name: '淡黄小花',
    seedCost: 12,
    growMs: 5 * 60_000,
    harvestId: 'crop_flower',
    harvestN: 2,
    sell: 10,
    aliases: ['花', '小花', '淡黄小花'],
  },
  {
    id: 'sunflower',
    name: '向日葵',
    seedCost: 16,
    growMs: 5.5 * 60_000,
    harvestId: 'crop_sunflower',
    harvestN: 2,
    sell: 12,
    aliases: ['向日葵'],
  },
  {
    id: 'lavender',
    name: '薰衣草',
    seedCost: 18,
    growMs: 6 * 60_000,
    harvestId: 'crop_lavender',
    harvestN: 2,
    sell: 14,
    aliases: ['薰衣草'],
  },
  {
    id: 'woodgrass',
    name: '木灵草',
    seedCost: 22,
    growMs: 7 * 60_000,
    harvestId: 'crop_woodgrass',
    harvestN: 2,
    sell: 18,
    aliases: ['木灵草'],
  },
  {
    id: 'harpbloom',
    name: '琴音花',
    seedCost: 28,
    growMs: 8 * 60_000,
    harvestId: 'crop_harpbloom',
    harvestN: 1,
    sell: 40,
    aliases: ['琴音花'],
  },
  {
    id: 'stardrop',
    name: '星露果',
    seedCost: 35,
    growMs: 10 * 60_000,
    harvestId: 'crop_stardrop',
    harvestN: 1,
    sell: 55,
    aliases: ['星露果'],
  },
];

/** 别名 → 作物（种植解析用） */
export const CROPS: Record<string, CropDef> = Object.fromEntries(
  CROP_LIST.flatMap((c) => c.aliases.map((a) => [a, c])),
);

export const CROP_BY_ID: Record<string, CropDef> = Object.fromEntries(
  CROP_LIST.map((c) => [c.id, c]),
);

/** 背包展示名 */
export const ITEM_NAME: Record<string, string> = {
  ...Object.fromEntries(FISH_TABLE.map((f) => [f.id, f.name])),
  ...Object.fromEntries(CROP_LIST.map((c) => [c.harvestId, c.name])),
};

/** 种植指令匹配：种/种植 + 任一别名 */
export const PLANT_ALIAS_PATTERN = new RegExp(
  `^种(?:植)?(${CROP_LIST.flatMap((c) => [...c.aliases]).sort((a, b) => b.length - a.length).map(escapeReg).join('|')})$`,
);

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function formatCropCatalog(): string {
  return CROP_LIST.map((c) => {
    const min = Math.round(c.growMs / 60000 * 10) / 10;
    const profit = c.harvestN * c.sell - c.seedCost;
    return `${c.name}：种${c.seedCost}瓣 / ${min}分 → ×${c.harvestN}（卖${c.sell}/个，约赚${profit}）`;
  }).join('\n');
}

export function formatFishCatalog(): string {
  const order: FishRarity[] = ['junk', 'common', 'uncommon', 'rare', 'epic', 'legendary'];
  const lines: string[] = [];
  for (const r of order) {
    const list = FISH_TABLE.filter((f) => f.rarity === r);
    if (list.length === 0) continue;
    lines.push(`【${RARITY_LABEL[r]}】`);
    lines.push(list.map((f) => `${f.name}(卖${f.price})`).join('、'));
  }
  return lines.join('\n');
}
