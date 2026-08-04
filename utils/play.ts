import {
  addBagItem,
  emptyPlot,
  localDateKey,
  takeBagItem,
  updateUser,
  yesterdayKey,
  type FarmPlot,
  type UserMemory,
} from './memory.ts';
import { normalizeChatText } from './chat.ts';

/** 钓鱼冷却（秒） */
const FISH_COOLDOWN_SEC = 45;
/** 开荒费用 */
const EXPAND_COST = 30;
/** 农田上限 */
const FARM_MAX_PLOTS = 3;

type FishDef = { id: string; name: string; weight: number; price: number; rare?: boolean };
type CropDef = { id: string; name: string; seedCost: number; growMs: number; harvestId: string; harvestN: number; sell: number };

const FISH_TABLE: readonly FishDef[] = [
  { id: 'fish_weed', name: '水草', weight: 18, price: 1 },
  { id: 'fish_boot', name: '破靴子', weight: 8, price: 0 },
  { id: 'fish_small', name: '小银鱼', weight: 28, price: 3 },
  { id: 'fish_carp', name: '锦鲤', weight: 20, price: 6 },
  { id: 'fish_cat', name: '猫鱼', weight: 12, price: 10 },
  { id: 'fish_wood', name: '木灵鱼', weight: 8, price: 18, rare: true },
  { id: 'fish_harp', name: '竖琴鲈', weight: 4, price: 35, rare: true },
  { id: 'fish_legend', name: '星原金鳞', weight: 2, price: 80, rare: true },
];

const CROPS: Record<string, CropDef> = {
  小麦: { id: 'wheat', name: '小麦', seedCost: 5, growMs: 2 * 60_000, harvestId: 'crop_wheat', harvestN: 2, sell: 4 },
  萝卜: { id: 'carrot', name: '萝卜', seedCost: 8, growMs: 3 * 60_000, harvestId: 'crop_carrot', harvestN: 2, sell: 6 },
  花: { id: 'flower', name: '淡黄小花', seedCost: 12, growMs: 5 * 60_000, harvestId: 'crop_flower', harvestN: 1, sell: 15 },
  小花: { id: 'flower', name: '淡黄小花', seedCost: 12, growMs: 5 * 60_000, harvestId: 'crop_flower', harvestN: 1, sell: 15 },
};

const CROP_BY_ID: Record<string, CropDef> = Object.fromEntries(
  [...new Map(Object.values(CROPS).map((c) => [c.id, c])).entries()],
);

const ITEM_NAME: Record<string, string> = {
  fish_weed: '水草',
  fish_boot: '破靴子',
  fish_small: '小银鱼',
  fish_carp: '锦鲤',
  fish_cat: '猫鱼',
  fish_wood: '木灵鱼',
  fish_harp: '竖琴鲈',
  fish_legend: '星原金鳞',
  crop_wheat: '小麦',
  crop_carrot: '萝卜',
  crop_flower: '淡黄小花',
  seed_wheat: '小麦种子',
  seed_carrot: '萝卜种子',
  seed_flower: '小花种子',
};

export type PlayMatch = { matched: true; reply: string };
export type PlayNoMatch = { matched: false };

function fmtRemain(ms: number): string {
  const s = Math.max(1, Math.ceil(ms / 1000));
  if (s < 60) return `${s}秒`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}分${r}秒` : `${m}分钟`;
}

function pickFish(): FishDef {
  const total = FISH_TABLE.reduce((a, f) => a + f.weight, 0);
  let r = Math.random() * total;
  for (const f of FISH_TABLE) {
    r -= f.weight;
    if (r <= 0) return f;
  }
  return FISH_TABLE[0]!;
}

function bagLines(data: UserMemory): string {
  const entries = Object.entries(data.bag).filter(([, n]) => n > 0);
  if (entries.length === 0) return '背包空空的～';
  return entries
    .map(([id, n]) => `${ITEM_NAME[id] ?? id}×${n}`)
    .join('、');
}

function plotStatus(plot: FarmPlot, i: number, now: number): string {
  const label = `地${i + 1}`;
  if (!plot.crop) return `${label}：空地`;
  const crop = CROP_BY_ID[plot.crop];
  const name = crop?.name ?? plot.crop;
  if (plot.readyAt != null && now >= plot.readyAt) {
    return `${label}：${name}已成熟，可「收获」`;
  }
  const left = (plot.readyAt ?? now) - now;
  const water = plot.watered ? '已浇水' : '未浇水';
  return `${label}：${name}生长中（约${fmtRemain(left)}，${water}）`;
}

function doCheckin(data: UserMemory): string {
  const today = localDateKey();
  if (data.checkin.lastDate === today) {
    return [
      '今天已经签过到啦，星临者大人♪',
      `连续 ${data.checkin.streak} 天 · 累计 ${data.checkin.total} 次`,
      `灵瓣：${data.coins}`,
    ].join('\n');
  }

  const yesterday = yesterdayKey();
  const streak = data.checkin.lastDate === yesterday ? data.checkin.streak + 1 : 1;
  const base = 10;
  const bonus = Math.min(20, (streak - 1) * 2);
  const gain = base + bonus;
  data.checkin.lastDate = today;
  data.checkin.streak = streak;
  data.checkin.total += 1;
  data.coins += gain;

  return [
    '签到成功～木灵朵在签到簿上画了一朵小花♪',
    `连续签到 ${streak} 天，获得灵瓣 +${gain}${bonus ? `（连续奖励 +${bonus}）` : ''}`,
    `当前灵瓣：${data.coins}`,
  ].join('\n');
}

function doFish(data: UserMemory): string {
  const now = Date.now();
  if (now < data.fishCooldownUntil) {
    return `鱼儿还没游回来呢，再等 ${fmtRemain(data.fishCooldownUntil - now)} 再钓吧～`;
  }

  const fish = pickFish();
  data.fishCooldownUntil = now + FISH_COOLDOWN_SEC * 1000;
  data.fishTotal += 1;
  addBagItem(data, fish.id, 1);

  if (!data.fishBest) data.fishBest = fish.name;
  else {
    const bestPrice = FISH_TABLE.find((f) => f.name === data.fishBest)?.price ?? 0;
    if (fish.price > bestPrice) data.fishBest = fish.name;
  }

  const tip = fish.rare
    ? '稀有！花蕊都亮了一下♪'
    : fish.price === 0
      ? '呃……也算收获？'
      : '收进背包啦，发「卖鱼」可变灵瓣～';

  return [
    `甩竿——！钓到了【${fish.name}】${fish.rare ? '✨' : ''}`,
    tip,
    `生涯钓鱼 ${data.fishTotal} 次 · 冷却 ${FISH_COOLDOWN_SEC} 秒`,
  ].join('\n');
}

function doSellFish(data: UserMemory): string {
  let gain = 0;
  let count = 0;
  for (const f of FISH_TABLE) {
    const n = data.bag[f.id] ?? 0;
    if (n <= 0) continue;
    gain += n * f.price;
    count += n;
    delete data.bag[f.id];
  }
  if (count === 0) return '背包里没有鱼可卖呢～先发「钓鱼」试试♪';
  data.coins += gain;
  return `卖掉 ${count} 件渔获，获得灵瓣 +${gain}（现有 ${data.coins}）♪`;
}

function doStatus(data: UserMemory): string {
  const now = Date.now();
  const farm = data.farm.map((p, i) => plotStatus(p, i, now)).join('\n');
  return [
    '【星临者档案】',
    `灵瓣：${data.coins}`,
    `签到：连续 ${data.checkin.streak} 天 · 累计 ${data.checkin.total} 次`,
    `钓鱼：${data.fishTotal} 次 · 最佳【${data.fishBest ?? '无'}】`,
    '— 农田 —',
    farm,
    '— 背包 —',
    bagLines(data),
  ].join('\n');
}

function doBag(data: UserMemory): string {
  return `背包：${bagLines(data)}\n灵瓣：${data.coins}`;
}

function doFarmView(data: UserMemory): string {
  const now = Date.now();
  const lines = data.farm.map((p, i) => plotStatus(p, i, now));
  return [
    '【木灵朵的小农场】',
    ...lines,
    '指令：种植小麦/萝卜/花 · 浇水 · 收获 · 开荒',
    `可种：小麦(${CROPS['小麦']!.seedCost}瓣/${CROPS['小麦']!.growMs / 60000}分) 萝卜(${CROPS['萝卜']!.seedCost}瓣/${CROPS['萝卜']!.growMs / 60000}分) 花(${CROPS['花']!.seedCost}瓣/${CROPS['花']!.growMs / 60000}分)`,
  ].join('\n');
}

function firstEmptyPlot(data: UserMemory): number {
  return data.farm.findIndex((p) => !p.crop);
}

function doPlant(data: UserMemory, cropKey: string): string {
  const crop = CROPS[cropKey];
  if (!crop) {
    return '可以种：小麦、萝卜、花～例如「种植小麦」';
  }
  const idx = firstEmptyPlot(data);
  if (idx < 0) {
    return `没有空地了（${data.farm.length}/${FARM_MAX_PLOTS}）。可先「收获」，或「开荒」扩地♪`;
  }
  if (data.coins < crop.seedCost) {
    return `灵瓣不够呢～种${crop.name}需要 ${crop.seedCost}，你有 ${data.coins}。先「签到」或「钓鱼」攒一点吧`;
  }
  data.coins -= crop.seedCost;
  const now = Date.now();
  data.farm[idx] = {
    crop: crop.id,
    plantedAt: now,
    readyAt: now + crop.growMs,
    watered: false,
  };
  return [
    `在地${idx + 1}种下了【${crop.name}】♪ 花费灵瓣 ${crop.seedCost}`,
    `大约 ${fmtRemain(crop.growMs)} 后成熟；发「浇水」可催熟一点哦`,
    `剩余灵瓣：${data.coins}`,
  ].join('\n');
}

function doWater(data: UserMemory): string {
  const now = Date.now();
  const idx = data.farm.findIndex(
    (p) => p.crop && !p.watered && p.readyAt != null && now < p.readyAt,
  );
  if (idx < 0) {
    const growing = data.farm.some((p) => p.crop && p.readyAt != null && now < p.readyAt);
    if (!growing) return '现在没有需要浇水的作物呀～先「种植小麦」之类试试看';
    return '正在生长的作物都浇过水啦♪';
  }
  const plot = data.farm[idx]!;
  plot.watered = true;
  const left = (plot.readyAt ?? now) - now;
  const reduced = Math.floor(left * 0.35);
  plot.readyAt = (plot.readyAt ?? now) - reduced;
  const crop = CROP_BY_ID[plot.crop!];
  return `给地${idx + 1}的【${crop?.name ?? plot.crop}】浇了清水～成熟提早约 ${fmtRemain(reduced)}♪`;
}

function doHarvest(data: UserMemory): string {
  const now = Date.now();
  const readyIdx = data.farm
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.crop && p.readyAt != null && now >= p.readyAt);

  if (readyIdx.length === 0) {
    const growing = data.farm.find((p) => p.crop && p.readyAt != null && now < p.readyAt);
    if (growing?.readyAt) {
      return `还没熟呢，再等 ${fmtRemain(growing.readyAt - now)}～发「农场」可查看进度`;
    }
    return '没有可收获的作物～先「种植萝卜」之类吧♪';
  }

  const parts: string[] = [];
  for (const { p, i } of readyIdx) {
    const crop = CROP_BY_ID[p.crop!];
    if (!crop) {
      data.farm[i] = emptyPlot();
      continue;
    }
    addBagItem(data, crop.harvestId, crop.harvestN);
    parts.push(`地${i + 1}【${crop.name}】×${crop.harvestN}`);
    data.farm[i] = emptyPlot();
  }
  return [
    `收获成功♪ ${parts.join('、')}`,
    '可发「卖菜」换成灵瓣，或继续种植～',
    `背包：${bagLines(data)}`,
  ].join('\n');
}

function doSellCrops(data: UserMemory): string {
  let gain = 0;
  let count = 0;
  for (const crop of new Map(Object.values(CROPS).map((c) => [c.harvestId, c])).values()) {
    const n = data.bag[crop.harvestId] ?? 0;
    if (n <= 0) continue;
    gain += n * crop.sell;
    count += n;
    delete data.bag[crop.harvestId];
  }
  if (count === 0) return '没有可卖的农产品呢～先「收获」吧';
  data.coins += gain;
  return `卖出作物 ${count} 件，灵瓣 +${gain}（现有 ${data.coins}）♪`;
}

function doExpand(data: UserMemory): string {
  if (data.farm.length >= FARM_MAX_PLOTS) {
    return `农田已经扩到上限 ${FARM_MAX_PLOTS} 块啦，木灵朵的小院子就这么大～`;
  }
  if (data.coins < EXPAND_COST) {
    return `开荒需要 ${EXPAND_COST} 灵瓣，你有 ${data.coins}～再攒攒♪`;
  }
  data.coins -= EXPAND_COST;
  data.farm.push(emptyPlot());
  return `开荒成功！现在有 ${data.farm.length} 块地啦，花费 ${EXPAND_COST} 灵瓣（剩 ${data.coins}）♪`;
}

function playHelp(): string {
  return [
    '【木灵朵小游戏】',
    '签到 — 每日领灵瓣',
    '钓鱼 / 卖鱼 — 甩竿与出货',
    '农场 — 查看田地',
    '种植小麦·萝卜·花 — 下种',
    '浇水 / 收获 / 开荒 / 卖菜',
    '背包 / 状态 — 查看资产',
  ].join('\n');
}

/**
 * 匹配签到与文字小游戏（短指令优先）
 * 触发尽量短：签到、钓鱼、种小麦、浇水、收获…
 */
export function matchPlay(userId: string, raw: string): PlayMatch | PlayNoMatch {
  const text = normalizeChatText(raw);
  if (!text) return { matched: false };

  // 精确或强特征指令
  const exact = text.replace(/\s+/g, '');

  type Handler = (data: UserMemory) => string;
  let handler: Handler | null = null;

  if (exact.includes('签到')) {
    handler = doCheckin;
  } else if (exact === '钓鱼' || exact === '钓' || exact === '甩竿') {
    handler = doFish;
  } else if (exact === '卖鱼' || exact === '出售渔获') {
    handler = doSellFish;
  } else if (exact === '农场' || exact === '田地' || exact === '我的农场') {
    handler = doFarmView;
  } else if (exact === '浇水') {
    handler = doWater;
  } else if (exact === '收获' || exact === '收菜' || exact === '采收') {
    handler = doHarvest;
  } else if (exact === '开荒' || exact === '扩地') {
    handler = doExpand;
  } else if (exact === '卖菜' || exact === '卖作物') {
    handler = doSellCrops;
  } else if (exact === '背包' || exact === '包裹') {
    handler = doBag;
  } else if (exact === '状态' || exact === '我的' || exact === '资产') {
    handler = doStatus;
  } else if (exact === '游戏' || exact === '小游戏' || exact === '玩法') {
    return { matched: true, reply: playHelp() };
  } else {
    const plant = exact.match(/^种(?:植)?(小麦|萝卜|花|小花)$/);
    if (plant) {
      const key = plant[1]!;
      handler = (data) => doPlant(data, key);
    }
  }

  if (!handler) return { matched: false };

  const reply = updateUser(userId, handler);
  return { matched: true, reply };
}
