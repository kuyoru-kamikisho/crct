import type { Direction, Food, FoodKind, Point } from './types';
import { CELL, GRID_COLS, GRID_ROWS, GOLDEN_TTL_MS, lerp } from './constants';
import type { Snake } from './snake';
import type { ParticleSystem } from './particles';

const FOOD_COLORS: Record<FoodKind, string> = {
  apple: '#e85d4c',
  golden: '#f0b429',
  berry: '#6c8cff',
  chili: '#ff6b35',
};

export class Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  width = GRID_COLS * CELL;
  height = GRID_ROWS * CELL;
  private dpr = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D not supported');
    this.ctx = ctx;
    this.resize();
  }

  resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = this.width;
    const cssH = this.height;
    this.canvas.width = Math.round(cssW * this.dpr);
    this.canvas.height = Math.round(cssH * this.dpr);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  clear(): void {
    const { ctx, width, height } = this;
    const g = ctx.createLinearGradient(0, 0, width, height);
    g.addColorStop(0, '#0c1412');
    g.addColorStop(0.5, '#101c18');
    g.addColorStop(1, '#0a1210');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);

    // Soft vignette
    const vg = ctx.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) * 0.2,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.75,
    );
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, width, height);

    this.drawGrid();
  }

  private drawGrid(): void {
    const { ctx } = this;
    ctx.strokeStyle = 'rgba(126, 200, 168, 0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= GRID_COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL + 0.5, 0);
      ctx.lineTo(x * CELL + 0.5, GRID_ROWS * CELL);
      ctx.stroke();
    }
    for (let y = 0; y <= GRID_ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL + 0.5);
      ctx.lineTo(GRID_COLS * CELL, y * CELL + 0.5);
      ctx.stroke();
    }
  }

  drawWalls(walls: Point[]): void {
    const { ctx } = this;
    for (const w of walls) {
      const x = w.x * CELL;
      const y = w.y * CELL;
      const pad = 3;
      ctx.fillStyle = 'rgba(45, 72, 62, 0.85)';
      roundRect(ctx, x + pad, y + pad, CELL - pad * 2, CELL - pad * 2, 6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(126, 200, 168, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
      // top highlight
      ctx.fillStyle = 'rgba(160, 220, 190, 0.12)';
      roundRect(ctx, x + pad + 2, y + pad + 2, CELL - pad * 2 - 4, 5, 3);
      ctx.fill();
    }
  }

  drawFood(foods: Food[], now: number): void {
    const { ctx } = this;
    for (const f of foods) {
      const cx = f.pos.x * CELL + CELL / 2;
      const cy = f.pos.y * CELL + CELL / 2;
      const pulse = 1 + Math.sin(now / 220 + f.pulse) * 0.08;
      const color = FOOD_COLORS[f.kind];

      // glow
      ctx.save();
      ctx.globalAlpha = 0.35;
      const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, CELL * 0.7);
      glow.addColorStop(0, color);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, CELL * 0.7 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (f.kind === 'golden') {
        const life = 1 - (now - f.bornAt) / GOLDEN_TTL_MS;
        // TTL ring
        ctx.strokeStyle = `rgba(240, 180, 41, ${0.35 + life * 0.5})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, CELL * 0.42, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, life));
        ctx.stroke();
      }

      this.drawFoodIcon(f.kind, cx, cy, pulse);
    }
  }

  private drawFoodIcon(kind: FoodKind, cx: number, cy: number, pulse: number): void {
    const { ctx } = this;
    const r = CELL * 0.28 * pulse;
    ctx.save();
    ctx.translate(cx, cy);

    if (kind === 'apple' || kind === 'golden') {
      ctx.fillStyle = FOOD_COLORS[kind];
      ctx.beginPath();
      ctx.arc(0, 2, r, 0, Math.PI * 2);
      ctx.fill();
      // leaf
      ctx.fillStyle = '#7ec8a8';
      ctx.beginPath();
      ctx.ellipse(4, -r * 0.7, 5, 3, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3d6b55';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.3);
      ctx.lineTo(0, -r * 1.1);
      ctx.stroke();
      if (kind === 'golden') {
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.beginPath();
        ctx.arc(-3, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (kind === 'berry') {
      const positions = [
        [-4, -2],
        [4, -2],
        [0, 4],
      ];
      for (const [ox, oy] of positions) {
        ctx.fillStyle = FOOD_COLORS.berry;
        ctx.beginPath();
        ctx.arc(ox, oy, r * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#9db4ff';
      ctx.beginPath();
      ctx.arc(0, -6, 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // chili
      ctx.fillStyle = FOOD_COLORS.chili;
      ctx.beginPath();
      ctx.moveTo(-2, -r);
      ctx.quadraticCurveTo(r * 1.4, 0, 0, r);
      ctx.quadraticCurveTo(-r * 1.1, 0, -2, -r);
      ctx.fill();
      ctx.fillStyle = '#5a9e72';
      ctx.beginPath();
      ctx.ellipse(0, -r - 1, 4, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawSnake(snake: Snake, alpha: number, effectTint: 'none' | 'slow' | 'fast'): void {
    const { ctx } = this;
    const body = snake.body;
    if (body.length === 0) return;

    for (let i = body.length - 1; i >= 0; i--) {
      const seg = body[i];
      let x = seg.x * CELL;
      let y = seg.y * CELL;

      // Interpolate head position
      if (i === 0 && alpha < 1) {
        const from = snake.prevHead;
        // Handle wrap jump: if distance is large, don't interpolate
        const dx = Math.abs(seg.x - from.x);
        const dy = Math.abs(seg.y - from.y);
        if (dx <= 1 && dy <= 1) {
          x = lerp(from.x, seg.x, alpha) * CELL;
          y = lerp(from.y, seg.y, alpha) * CELL;
        }
      }

      const t = i / Math.max(1, body.length - 1);
      const isHead = i === 0;
      const pad = isHead ? 2 : 3.5 + t * 1.5;
      const radius = isHead ? 8 : 7;

      let base = effectTint === 'slow' ? '#6c8cff' : effectTint === 'fast' ? '#ff8f5a' : '#5fd4a0';
      let mid = effectTint === 'slow' ? '#8aa4ff' : effectTint === 'fast' ? '#ffb088' : '#8aefc1';
      if (!isHead) {
        const shade = 1 - t * 0.35;
        base = shadeColor(base, shade);
        mid = shadeColor(mid, shade);
      }

      const grad = ctx.createLinearGradient(x, y, x + CELL, y + CELL);
      grad.addColorStop(0, mid);
      grad.addColorStop(1, base);
      ctx.fillStyle = grad;
      roundRect(ctx, x + pad, y + pad, CELL - pad * 2, CELL - pad * 2, radius);
      ctx.fill();

      if (isHead) {
        this.drawEyes(x, y, snake.direction);
      }
    }
  }

  private drawEyes(x: number, y: number, dir: Direction): void {
    const { ctx } = this;
    const cx = x + CELL / 2;
    const cy = y + CELL / 2;
    const offsets: Record<Direction, [number, number, number, number]> = {
      up: [-5, -4, 5, -4],
      down: [-5, 4, 5, 4],
      left: [-5, -4, -5, 4],
      right: [5, -4, 5, 4],
    };
    const [ex1, ey1, ex2, ey2] = offsets[dir];
    for (const [ex, ey] of [
      [ex1, ey1],
      [ex2, ey2],
    ]) {
      ctx.fillStyle = '#0c1412';
      ctx.beginPath();
      ctx.arc(cx + ex, cy + ey, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.arc(cx + ex - 0.6, cy + ey - 0.6, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawParticles(ps: ParticleSystem): void {
    ps.draw(this.ctx);
  }

  drawFlash(intensity: number): void {
    if (intensity <= 0) return;
    this.ctx.fillStyle = `rgba(255, 120, 100, ${intensity * 0.25})`;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function shadeColor(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * factor);
  const g = Math.round(((n >> 8) & 255) * factor);
  const b = Math.round((n & 255) * factor);
  return `rgb(${r},${g},${b})`;
}
