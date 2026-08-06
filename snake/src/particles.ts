import type { Particle } from './types';

export class ParticleSystem {
  particles: Particle[] = [];

  burst(x: number, y: number, color: string, count = 14, speed = 2.4): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const v = speed * (0.5 + Math.random());
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        life: 1,
        maxLife: 0.45 + Math.random() * 0.45,
        size: 2 + Math.random() * 3.5,
        color,
        gravity: 0.04 + Math.random() * 0.05,
      });
    }
  }

  spark(x: number, y: number, color: string): void {
    this.burst(x, y, color, 8, 1.6);
  }

  death(x: number, y: number): void {
    this.burst(x, y, '#f07178', 28, 3.2);
    this.burst(x, y, '#ffd580', 12, 2.0);
  }

  update(dt: number): void {
    const next: Particle[] = [];
    for (const p of this.particles) {
      p.life -= dt / p.maxLife;
      if (p.life <= 0) continue;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.98;
      next.push(p);
    }
    this.particles = next;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life) * 0.9;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  clear(): void {
    this.particles = [];
  }
}
