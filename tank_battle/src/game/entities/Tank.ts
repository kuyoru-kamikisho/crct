import type { Direction, Rect, TankConfig } from '../types'
import { BULLET_SIZE, DIR_DELTA, TANK_SIZE } from '../constants'
import { now } from '../utils'

let nextId = 1

export class Bullet {
  readonly id = nextId++
  x: number
  y: number
  direction: Direction
  speed: number
  ownerIsPlayer: boolean
  ownerId: number
  alive = true

  constructor(
    x: number,
    y: number,
    direction: Direction,
    speed: number,
    ownerIsPlayer: boolean,
    ownerId: number,
  ) {
    this.x = x
    this.y = y
    this.direction = direction
    this.speed = speed
    this.ownerIsPlayer = ownerIsPlayer
    this.ownerId = ownerId
  }

  get rect(): Rect {
    return { x: this.x, y: this.y, w: BULLET_SIZE, h: BULLET_SIZE }
  }

  update(): void {
    const { dx, dy } = DIR_DELTA[this.direction]
    this.x += dx * this.speed
    this.y += dy * this.speed
  }
}

export class Tank {
  readonly id = nextId++
  x: number
  y: number
  direction: Direction
  speed: number
  isPlayer: boolean
  color: string
  alive = true
  invincibleUntil = 0
  lastFireAt = 0
  /** AI：下次转向时间 */
  nextThinkAt = 0

  constructor(config: TankConfig) {
    this.x = config.x
    this.y = config.y
    this.direction = config.direction
    this.speed = config.speed
    this.isPlayer = config.isPlayer
    this.color = config.color
  }

  get rect(): Rect {
    return { x: this.x, y: this.y, w: TANK_SIZE, h: TANK_SIZE }
  }

  isInvincible(t = now()): boolean {
    return t < this.invincibleUntil
  }

  grantInvincible(ms: number): void {
    this.invincibleUntil = now() + ms
  }

  canFire(cooldown: number, t = now()): boolean {
    return t - this.lastFireAt >= cooldown
  }

  markFired(t = now()): void {
    this.lastFireAt = t
  }

  /** 炮口位置（子弹生成点） */
  muzzle(): { x: number; y: number } {
    const cx = this.x + TANK_SIZE / 2
    const cy = this.y + TANK_SIZE / 2
    const half = BULLET_SIZE / 2
    switch (this.direction) {
      case 'up':
        return { x: cx - half, y: this.y - BULLET_SIZE }
      case 'down':
        return { x: cx - half, y: this.y + TANK_SIZE }
      case 'left':
        return { x: this.x - BULLET_SIZE, y: cy - half }
      case 'right':
        return { x: this.x + TANK_SIZE, y: cy - half }
    }
  }
}
