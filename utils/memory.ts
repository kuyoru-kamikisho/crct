import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 开箱即用的简易记忆：按用户各存一份 JSON 文件
 * - 不占内存常驻整表，读写当前用户即可
 * - 无数据库依赖，丢了也没关系（可删 .data/memory）
 * - 单进程足够；不做跨进程锁
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '.data', 'memory');

export type CheckinState = {
  /** 上次签到日 YYYY-MM-DD（本地时区） */
  lastDate: string;
  /** 连续签到天数 */
  streak: number;
  /** 累计签到次数 */
  total: number;
};

export type FarmPlot = {
  /** 作物 id，空地为 null */
  crop: string | null;
  /** 种植时间戳 ms */
  plantedAt: number | null;
  /** 预计成熟时间戳 ms */
  readyAt: number | null;
  /** 本轮是否已浇水 */
  watered: boolean;
};

export type UserMemory = {
  /** 灵瓣（货币） */
  coins: number;
  checkin: CheckinState;
  /** 背包：物品 id → 数量 */
  bag: Record<string, number>;
  /** 钓鱼冷却结束时间戳 ms */
  fishCooldownUntil: number;
  /** 生涯钓鱼次数 */
  fishTotal: number;
  /** 钓到过的最佳鱼名 */
  fishBest: string | null;
  /** 农田（默认 1 块，开荒可扩） */
  farm: FarmPlot[];
};

export function defaultUserMemory(): UserMemory {
  return {
    coins: 0,
    checkin: { lastDate: '', streak: 0, total: 0 },
    bag: {},
    fishCooldownUntil: 0,
    fishTotal: 0,
    fishBest: null,
    farm: [emptyPlot()],
  };
}

export function emptyPlot(): FarmPlot {
  return { crop: null, plantedAt: null, readyAt: null, watered: false };
}

/** 去掉路径不安全字符，避免 openid 里的特殊符号 */
export function safeUserKey(userId: string): string {
  const key = String(userId || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
  return key.slice(0, 120) || 'unknown';
}

function userPath(userId: string): string {
  return join(ROOT, `${safeUserKey(userId)}.json`);
}

function ensureDir(): void {
  if (!existsSync(ROOT)) mkdirSync(ROOT, { recursive: true });
}

function mergeDefaults(raw: Partial<UserMemory> | null | undefined): UserMemory {
  const base = defaultUserMemory();
  if (!raw || typeof raw !== 'object') return base;
  return {
    coins: Number.isFinite(raw.coins) ? Number(raw.coins) : base.coins,
    checkin: {
      lastDate: raw.checkin?.lastDate ?? '',
      streak: Number(raw.checkin?.streak) || 0,
      total: Number(raw.checkin?.total) || 0,
    },
    bag: raw.bag && typeof raw.bag === 'object' ? { ...raw.bag } : {},
    fishCooldownUntil: Number(raw.fishCooldownUntil) || 0,
    fishTotal: Number(raw.fishTotal) || 0,
    fishBest: raw.fishBest ?? null,
    farm:
      Array.isArray(raw.farm) && raw.farm.length > 0
        ? raw.farm.map((p) => ({
            crop: p?.crop ?? null,
            plantedAt: p?.plantedAt ?? null,
            readyAt: p?.readyAt ?? null,
            watered: Boolean(p?.watered),
          }))
        : base.farm,
  };
}

/** 读取某用户记忆；不存在则返回默认值（不立刻写盘） */
export function loadUser(userId: string): UserMemory {
  ensureDir();
  const path = userPath(userId);
  if (!existsSync(path)) return defaultUserMemory();
  try {
    const text = readFileSync(path, 'utf8');
    return mergeDefaults(JSON.parse(text) as Partial<UserMemory>);
  } catch (err) {
    console.warn('[memory] 读取失败，使用默认值', safeUserKey(userId), (err as Error).message);
    return defaultUserMemory();
  }
}

/** 覆盖写入某用户记忆（先写临时文件再 rename，降低半截写入风险） */
export function saveUser(userId: string, data: UserMemory): void {
  ensureDir();
  const path = userPath(userId);
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 0), 'utf8');
  renameSync(tmp, path);
}

/**
 * 读 → 改 → 写；业务侧只关心 mutate 返回的回复文案
 */
export function updateUser<T>(userId: string, mutate: (data: UserMemory) => T): T {
  const data = loadUser(userId);
  const result = mutate(data);
  saveUser(userId, data);
  return result;
}

export function addBagItem(data: UserMemory, itemId: string, n = 1): void {
  if (n <= 0) return;
  data.bag[itemId] = (data.bag[itemId] ?? 0) + n;
}

export function takeBagItem(data: UserMemory, itemId: string, n = 1): boolean {
  const have = data.bag[itemId] ?? 0;
  if (have < n) return false;
  const left = have - n;
  if (left <= 0) delete data.bag[itemId];
  else data.bag[itemId] = left;
  return true;
}

/** 本地日历日 YYYY-MM-DD */
export function localDateKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 昨日本地日 */
export function yesterdayKey(d = new Date()): string {
  const t = new Date(d);
  t.setDate(t.getDate() - 1);
  return localDateKey(t);
}
