import type { Direction, Point } from './types';
import { DIR_DELTA, GRID_COLS, GRID_ROWS, pointsEqual } from './constants';

export class Snake {
  body: Point[] = [];
  direction: Direction = 'right';
  growPending = 0;
  /** Previous head for smooth interpolation */
  prevHead: Point = { x: 0, y: 0 };

  reset(start?: Point): void {
    const sx = start?.x ?? Math.floor(GRID_COLS / 2) - 2;
    const sy = start?.y ?? Math.floor(GRID_ROWS / 2);
    this.body = [
      { x: sx + 2, y: sy },
      { x: sx + 1, y: sy },
      { x: sx, y: sy },
    ];
    this.direction = 'right';
    this.growPending = 0;
    this.prevHead = { ...this.body[0] };
  }

  get head(): Point {
    return this.body[0];
  }

  get length(): number {
    return this.body.length;
  }

  occupies(p: Point, ignoreTail = false): boolean {
    const end = ignoreTail && this.growPending === 0 ? this.body.length - 1 : this.body.length;
    for (let i = 0; i < end; i++) {
      if (pointsEqual(this.body[i], p)) return true;
    }
    return false;
  }

  nextHead(dir: Direction = this.direction): Point {
    const d = DIR_DELTA[dir];
    return { x: this.head.x + d.x, y: this.head.y + d.y };
  }

  wrapHead(p: Point): Point {
    return {
      x: ((p.x % GRID_COLS) + GRID_COLS) % GRID_COLS,
      y: ((p.y % GRID_ROWS) + GRID_ROWS) % GRID_ROWS,
    };
  }

  step(dir: Direction, wrap: boolean): { next: Point; hitWall: boolean } {
    this.direction = dir;
    this.prevHead = { ...this.head };
    let next = this.nextHead(dir);
    let hitWall = false;

    if (wrap) {
      next = this.wrapHead(next);
    } else if (next.x < 0 || next.y < 0 || next.x >= GRID_COLS || next.y >= GRID_ROWS) {
      hitWall = true;
      return { next, hitWall };
    }

    this.body.unshift(next);
    if (this.growPending > 0) {
      this.growPending -= 1;
    } else {
      this.body.pop();
    }
    return { next, hitWall };
  }

  grow(n = 1): void {
    this.growPending += n;
  }
}
