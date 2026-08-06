import type { Direction } from './types';
import { OPPOSITE } from './constants';

export class InputController {
  private queue: Direction[] = [];
  private lastCommitted: Direction = 'right';
  private swipeStart: { x: number; y: number } | null = null;
  private listeners: Array<() => void> = [];

  onAction: ((action: 'pause' | 'restart' | 'confirm') => void) | null = null;

  constructor() {
    this.bind();
  }

  private bind(): void {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Direction | 'pause' | 'restart' | 'confirm'> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
        w: 'up',
        W: 'up',
        s: 'down',
        S: 'down',
        a: 'left',
        A: 'left',
        d: 'right',
        D: 'right',
        ' ': 'pause',
        Escape: 'pause',
        p: 'pause',
        P: 'pause',
        r: 'restart',
        R: 'restart',
        Enter: 'confirm',
      };
      const action = map[e.key];
      if (!action) return;
      e.preventDefault();
      if (action === 'pause' || action === 'restart' || action === 'confirm') {
        this.onAction?.(action);
        return;
      }
      this.pushDirection(action);
    };

    window.addEventListener('keydown', onKey);
    this.listeners.push(() => window.removeEventListener('keydown', onKey));
  }

  bindTouchSurface(el: HTMLElement): void {
    const start = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      this.swipeStart = { x: t.clientX, y: t.clientY };
    };
    const end = (e: TouchEvent) => {
      if (!this.swipeStart) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - this.swipeStart.x;
      const dy = t.clientY - this.swipeStart.y;
      this.swipeStart = null;
      if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        this.pushDirection(dx > 0 ? 'right' : 'left');
      } else {
        this.pushDirection(dy > 0 ? 'down' : 'up');
      }
    };
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchend', end, { passive: true });
    this.listeners.push(() => {
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchend', end);
    });
  }

  pushDirection(dir: Direction): void {
    const base = this.queue.length > 0 ? this.queue[this.queue.length - 1] : this.lastCommitted;
    if (dir === base || dir === OPPOSITE[base]) return;
    if (this.queue.length >= 2) return;
    this.queue.push(dir);
  }

  consumeDirection(): Direction {
    if (this.queue.length > 0) {
      this.lastCommitted = this.queue.shift()!;
    }
    return this.lastCommitted;
  }

  peekQueue(): Direction[] {
    return [...this.queue];
  }

  reset(initial: Direction = 'right'): void {
    this.queue = [];
    this.lastCommitted = initial;
  }

  setCommitted(dir: Direction): void {
    this.lastCommitted = dir;
  }

  destroy(): void {
    for (const off of this.listeners) off();
    this.listeners = [];
  }
}
