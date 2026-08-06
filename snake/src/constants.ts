import type { Difficulty, Direction, FoodKind, GameMode, Point } from './types';

export const GRID_COLS = 24;
export const GRID_ROWS = 18;
export const CELL = 28;

export const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

export const DIR_DELTA: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export const TICK_MS: Record<Difficulty, number> = {
  easy: 160,
  normal: 120,
  hard: 85,
  insane: 55,
};

export const FOOD_SCORE: Record<FoodKind, number> = {
  apple: 10,
  golden: 50,
  berry: 15,
  chili: 20,
};

export const FOOD_WEIGHTS: Record<FoodKind, number> = {
  apple: 70,
  golden: 8,
  berry: 12,
  chili: 10,
};

export const EFFECT_DURATION_TICKS = 40;
export const COMBO_WINDOW_TICKS = 12;
export const GOLDEN_TTL_MS = 8000;

export const MODE_LABEL: Record<GameMode, string> = {
  classic: '经典',
  wrap: '穿墙',
  maze: '迷宫',
};

export const DIFF_LABEL: Record<Difficulty, string> = {
  easy: '简单',
  normal: '普通',
  hard: '困难',
  insane: '疯狂',
};

export const FOOD_LABEL: Record<FoodKind, string> = {
  apple: '苹果',
  golden: '金苹果',
  berry: '浆果',
  chili: '辣椒',
};

export const STORAGE_KEY = 'serpent-highscores';
export const SETTINGS_KEY = 'serpent-settings';

export function pointsEqual(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

export function pointKey(p: Point): string {
  return `${p.x},${p.y}`;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pickWeighted<T extends string>(weights: Record<T, number>): T {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [key, w] of entries) {
    r -= w;
    if (r <= 0) return key;
  }
  return entries[entries.length - 1][0];
}
