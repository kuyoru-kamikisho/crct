import type { Food, FoodKind, Point } from './types';
import {
  FOOD_WEIGHTS,
  GRID_COLS,
  GRID_ROWS,
  GOLDEN_TTL_MS,
  pickWeighted,
  pointKey,
  pointsEqual,
  randInt,
} from './constants';

export function generateMaze(): Point[] {
  const walls: Point[] = [];
  // Vertical pillars with gaps for corridors
  for (let x = 5; x < GRID_COLS - 4; x += 6) {
    for (let y = 2; y < GRID_ROWS - 2; y++) {
      if (y === 5 || y === 6 || y === 11 || y === 12) continue;
      walls.push({ x, y });
    }
  }
  // A few horizontal bars
  for (const y of [4, 13]) {
    for (let x = 2; x < GRID_COLS - 2; x++) {
      if (x % 6 === 5) continue;
      if (x >= 9 && x <= 14) continue;
      walls.push({ x, y });
    }
  }
  const seen = new Set<string>();
  return walls.filter((p) => {
    const k = pointKey(p);
    if (seen.has(k)) return false;
    if (Math.abs(p.x - GRID_COLS / 2) <= 3 && Math.abs(p.y - GRID_ROWS / 2) <= 2) return false;
    seen.add(k);
    return true;
  });
}

export class FoodManager {
  foods: Food[] = [];

  clear(): void {
    this.foods = [];
  }

  occupiedSet(extra: Point[] = []): Set<string> {
    const set = new Set(extra.map(pointKey));
    for (const f of this.foods) set.add(pointKey(f.pos));
    return set;
  }

  randomEmpty(blocked: Set<string>): Point | null {
    const free: Point[] = [];
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        if (!blocked.has(pointKey({ x, y }))) free.push({ x, y });
      }
    }
    if (free.length === 0) return null;
    return free[randInt(0, free.length - 1)];
  }

  spawn(blocked: Point[], kind?: FoodKind, now = performance.now()): Food | null {
    const set = this.occupiedSet(blocked);
    const pos = this.randomEmpty(set);
    if (!pos) return null;
    const food: Food = {
      pos,
      kind: kind ?? pickWeighted(FOOD_WEIGHTS),
      bornAt: now,
      pulse: Math.random() * Math.PI * 2,
    };
    this.foods.push(food);
    return food;
  }

  ensureCount(n: number, blocked: Point[], now = performance.now()): void {
    while (this.foods.length < n) {
      if (!this.spawn(blocked, undefined, now)) break;
    }
  }

  findAt(p: Point): Food | undefined {
    return this.foods.find((f) => pointsEqual(f.pos, p));
  }

  remove(food: Food): void {
    this.foods = this.foods.filter((f) => f !== food);
  }

  updateTimers(now: number, blocked: Point[]): void {
    const expired = this.foods.filter((f) => f.kind === 'golden' && now - f.bornAt > GOLDEN_TTL_MS);
    for (const f of expired) this.remove(f);
    if (expired.length > 0) {
      this.ensureCount(1, blocked, now);
    }
  }
}
