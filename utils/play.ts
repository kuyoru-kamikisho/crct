import {
  addBagItem,
  emptyPlot,
  localDateKey,
  updateUser,
  yesterdayKey,
  type FarmPlot,
  type UserMemory,
} from './memory.ts';
import { normalizeChatText } from './chat.ts';
import type { PlayPanel } from './keyboard.ts';
import {
  CROP_BY_ID,
  CROP_LIST,
  CROPS,
  FISH_TABLE,
  ITEM_NAME,
  PLANT_ALIAS_PATTERN,
  RARITY_LABEL,
  RARITY_MARK,
  formatCropCatalog,
  formatFishCatalog,
  type FishDef,
} from './play_catalog.ts';

/** 钓鱼冷却（秒） */
const FISH_COOLDOWN_SEC = 40;
/** 开荒费用 */
const EXPAND_COST = 30;
/** 农田上限 */
const FARM_MAX_PLOTS = 4;

export type PlayMatch = { matched: true; reply: string; panel: PlayPanel };
export type PlayNoMatch = { matched: false };

/** 根据指令推断应附带的按钮面板 */
export function panelForCommand(cmd: string): PlayPanel {
  const exact = cmd.replace(/\s+/g, '');
  if (exact === '钓鱼' || exact === '钓' || exact === '甩竿' || exact === '卖鱼' || exact === '鱼图鉴') {
    return 'fish';
  }
  if (
    exact === '农场' ||
    exact === '田地' ||
    exact === '浇水' ||
    exact === '收获' ||
    exact === '收菜' ||
    exact === '开荒' ||
    exact === '卖菜' ||
    exact === '作物图鉴' ||
    exact === '种图鉴' ||
    PLANT_ALIAS_PATTERN.test(exact)
  ) {
    return 'farm';
  }
  return 'main';
}

function fmtRemain(ms: number): string {
  const s = Math.max(1, Math.ceil(ms / 1000));
  if (s < 60) return `${s}秒`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}分${r}秒` : `${m}分钟`;
}

function fmtGrowMin(ms: number): string {
  const v = Math.round((ms / 60_000) * 10) / 10;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
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

function fishTip(fish: FishDef): string {
  switch (fish.rarity) {
    case 'legendary':
      return '传说级渔获！竖琴都自己响起来了♪';
    case 'epic':
      return '史诗！花蕊闪了一大下～快收进背包！';
    case 'rare':
      return '稀有鱼！运气不错呢✨';
    case 'uncommon':
      return '少见货色，卖相应灵瓣也不错～';
    case 'junk':
      return fish.price <= 0 ? '呃……也算收获？' : '杂物也能换一点点灵瓣啦';
    default:
      return '收进背包啦，点「卖鱼」可变灵瓣～';
  }
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

  const mark = RARITY_MARK[fish.rarity];
  return [
    `甩竿——！钓到了【${fish.name}】${mark}`,
    `${RARITY_LABEL[fish.rarity]} · 可卖 ${fish.price} 灵瓣`,
    fishTip(fish),
    `生涯钓鱼 ${data.fishTotal} 次 · 冷却 ${FISH_COOLDOWN_SEC} 秒`,
  ].join('\n');
}

function doSellFish(data: UserMemory): string {
  let gain = 0;
  let count = 0;
  const parts: string[] = [];
  for (const f of FISH_TABLE) {
    const n = data.bag[f.id] ?? 0;
    if (n <= 0) continue;
    const sub = n * f.price;
    gain += sub;
    count += n;
    if (f.rarity === 'rare' || f.rarity === 'epic' || f.rarity === 'legendary') {
      parts.push(`${f.name}×${n}`);
    }
    delete data.bag[f.id];
  }
  if (count === 0) return '背包里没有鱼可卖呢～先发「钓鱼」试试♪';
  data.coins += gain;
  const rareNote = parts.length ? `\n其中珍品：${parts.join('、')}` : '';
  return `卖掉 ${count} 件渔获，获得灵瓣 +${gain}（现有 ${data.coins}）♪${rareNote}`;
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
  const preview = CROP_LIST.slice(0, 6)
    .map((c) => `${c.name}${c.seedCost}瓣/${fmtGrowMin(c.growMs)}分`)
    .join(' ');
  return [
    '【木灵朵的小农场】',
    ...lines,
    `地块 ${data.farm.length}/${FARM_MAX_PLOTS} · 点「去种植」或发「种植小麦」等`,
    `常用：${preview} …`,
    '完整价目发「作物图鉴」♪',
  ].join('\n');
}

function firstEmptyPlot(data: UserMemory): number {
  return data.farm.findIndex((p) => !p.crop);
}

function doPlant(data: UserMemory, cropKey: string): string {
  const crop = CROPS[cropKey];
  if (!crop) {
    return `可以种：${CROP_LIST.map((c) => c.name).join('、')}～例如「种植草莓」\n发「作物图鉴」看详情`;
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
  const expect = crop.harvestN * crop.sell;
  return [
    `在地${idx + 1}种下了【${crop.name}】♪ 花费灵瓣 ${crop.seedCost}`,
    `大约 ${fmtRemain(crop.growMs)} 后成熟（收成约 ${crop.harvestN}×${crop.sell}=${expect} 瓣）`,
    `发「浇水」可催熟一点 · 剩余灵瓣：${data.coins}`,
  ].join('\n');
}

function doWater(data: UserMemory): string {
  const now = Date.now();
  const idx = data.farm.findIndex(
    (p) => p.crop && !p.watered && p.readyAt != null && now < p.readyAt,
  );
  if (idx < 0) {
    const growing = data.farm.some((p) => p.crop && p.readyAt != null && now < p.readyAt);
    if (!growing) return '现在没有需要浇水的作物呀～先「种植土豆」之类试试看';
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
    return '没有可收获的作物～先「种植玉米」之类吧♪';
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
  for (const crop of CROP_LIST) {
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
    '【木灵朵小游戏】点下方按钮，或发文字指令：',
    '签到 — 每日领灵瓣',
    '钓鱼 / 卖鱼 — 甩竿与出货（鱼图鉴）',
    '农场 — 查看田地；种植×× / 浇水 / 收获',
    '作物图鉴 — 全部作物价目与耗时',
    '开荒 / 卖菜 / 背包 / 状态 / 菜单',
  ].join('\n');
}

/**
 * 匹配签到与文字小游戏（短指令优先）
 */
export function matchPlay(userId: string, raw: string): PlayMatch | PlayNoMatch {
  const text = normalizeChatText(raw);
  if (!text) return { matched: false };

  const exact = text.replace(/\s+/g, '');

  type Handler = (data: UserMemory) => string;
  let handler: Handler | null = null;
  let panel: PlayPanel = 'main';

  if (exact.includes('签到')) {
    handler = doCheckin;
    panel = 'main';
  } else if (exact === '钓鱼' || exact === '钓' || exact === '甩竿') {
    handler = doFish;
    panel = 'fish';
  } else if (exact === '卖鱼' || exact === '出售渔获') {
    handler = doSellFish;
    panel = 'fish';
  } else if (exact === '鱼图鉴' || exact === '钓鱼图鉴') {
    return {
      matched: true,
      reply: `【鱼类图鉴】共 ${FISH_TABLE.length} 种\n${formatFishCatalog()}`,
      panel: 'fish',
    };
  } else if (exact === '作物图鉴' || exact === '种图鉴' || exact === '农场图鉴') {
    return {
      matched: true,
      reply: `【作物图鉴】共 ${CROP_LIST.length} 种\n${formatCropCatalog()}`,
      panel: 'farm',
    };
  } else if (exact === '农场' || exact === '田地' || exact === '我的农场') {
    handler = doFarmView;
    panel = 'farm';
  } else if (exact === '浇水') {
    handler = doWater;
    panel = 'farm';
  } else if (exact === '收获' || exact === '收菜' || exact === '采收') {
    handler = doHarvest;
    panel = 'farm';
  } else if (exact === '开荒' || exact === '扩地') {
    handler = doExpand;
    panel = 'farm';
  } else if (exact === '卖菜' || exact === '卖作物') {
    handler = doSellCrops;
    panel = 'farm';
  } else if (exact === '背包' || exact === '包裹') {
    handler = doBag;
    panel = 'main';
  } else if (exact === '状态' || exact === '我的' || exact === '资产') {
    handler = doStatus;
    panel = 'main';
  } else if (exact === '游戏' || exact === '小游戏' || exact === '玩法' || exact === '菜单') {
    return { matched: true, reply: playHelp(), panel: 'main' };
  } else {
    const plant = exact.match(PLANT_ALIAS_PATTERN);
    if (plant) {
      const key = plant[1]!;
      handler = (data) => doPlant(data, key);
      panel = 'farm';
    }
  }

  if (!handler) return { matched: false };

  const reply = updateUser(userId, handler);
  return { matched: true, reply, panel };
}
