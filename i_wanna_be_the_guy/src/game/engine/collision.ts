export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface Vec2 {
  x: number
  y: number
}

export function aabb(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

export function inflate(r: Rect, pad: number): Rect {
  return { x: r.x - pad, y: r.y - pad, w: r.w + pad * 2, h: r.h + pad * 2 }
}

export function centerOf(r: Rect): Vec2 {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 }
}

/** Spike triangle hitbox — tighter than full tile for fair IWBTG feel */
export function spikeHitbox(x: number, y: number, dir: 'up' | 'down' | 'left' | 'right', tile: number): Rect {
  const m = tile * 0.18
  switch (dir) {
    case 'up':
      return { x: x + m, y: y + tile * 0.35, w: tile - m * 2, h: tile * 0.65 }
    case 'down':
      return { x: x + m, y: y, w: tile - m * 2, h: tile * 0.65 }
    case 'left':
      return { x: x + tile * 0.35, y: y + m, w: tile * 0.65, h: tile - m * 2 }
    case 'right':
      return { x: x, y: y + m, w: tile * 0.65, h: tile - m * 2 }
  }
}
