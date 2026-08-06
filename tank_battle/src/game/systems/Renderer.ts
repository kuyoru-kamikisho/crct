import { TileType } from '../types'
import type { Direction } from '../types'
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  TILE_SIZE,
  TANK_SIZE,
  BULLET_SIZE,
} from '../constants'
import type { GameMap } from '../map/Map'
import type { Bullet, Tank } from '../entities/Tank'
import { now } from '../utils'

const BRICK_COLOR = '#b54a2a'
const BRICK_DARK = '#8a341c'
const STEEL_COLOR = '#9aa0a6'
const GROUND = '#1a1f16'
const GRID_LINE = '#22291c'

export class Renderer {
  private ctx: CanvasRenderingContext2D

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D 不可用')
    this.ctx = ctx
    canvas.width = MAP_WIDTH
    canvas.height = MAP_HEIGHT
  }

  clear(): void {
    this.ctx.fillStyle = GROUND
    this.ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT)
  }

  drawMap(map: GameMap): void {
    const { ctx } = this
    for (let r = 0; r < map.tiles.length; r++) {
      for (let c = 0; c < map.tiles[r].length; c++) {
        const tile = map.tiles[r][c]
        if (tile === TileType.Empty) continue
        if (tile === TileType.Base || tile === TileType.BaseDestroyed) continue
        this.drawTile(tile, c * TILE_SIZE, r * TILE_SIZE)
      }
    }

    this.drawBase(map)

    ctx.strokeStyle = GRID_LINE
    ctx.lineWidth = 1
    ctx.globalAlpha = 0.15
    for (let i = 0; i <= MAP_WIDTH; i += TILE_SIZE * 2) {
      ctx.beginPath()
      ctx.moveTo(i + 0.5, 0)
      ctx.lineTo(i + 0.5, MAP_HEIGHT)
      ctx.stroke()
    }
    for (let i = 0; i <= MAP_HEIGHT; i += TILE_SIZE * 2) {
      ctx.beginPath()
      ctx.moveTo(0, i + 0.5)
      ctx.lineTo(MAP_WIDTH, i + 0.5)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }

  private drawTile(type: TileType, x: number, y: number): void {
    const { ctx } = this
    const s = TILE_SIZE
    if (type === TileType.Brick) {
      ctx.fillStyle = BRICK_COLOR
      ctx.fillRect(x, y, s, s)
      ctx.fillStyle = BRICK_DARK
      ctx.fillRect(x, y, s, 2)
      ctx.fillRect(x, y + s / 2 - 1, s, 2)
      ctx.fillRect(x + s / 2 - 1, y, 2, s / 2)
      ctx.fillRect(x, y + s / 2, 2, s / 2)
      ctx.fillRect(x + s - 2, y + s / 2, 2, s / 2)
      return
    }
    if (type === TileType.Steel) {
      ctx.fillStyle = '#6d737a'
      ctx.fillRect(x, y, s, s)
      ctx.fillStyle = STEEL_COLOR
      ctx.fillRect(x + 2, y + 2, s - 4, s - 4)
      ctx.fillStyle = '#c5cad0'
      ctx.fillRect(x + 3, y + 3, s / 2 - 2, 3)
      ctx.fillRect(x + 3, y + 3, 3, s / 2 - 2)
    }
  }

  private drawBase(map: GameMap): void {
    const { ctx } = this
    let found = false
    let bx = 0
    let by = 0
    let destroyed = false

    for (let r = 0; r < map.tiles.length && !found; r++) {
      for (let c = 0; c < map.tiles[r].length; c++) {
        const t = map.tiles[r][c]
        if (t === TileType.Base || t === TileType.BaseDestroyed) {
          bx = c * TILE_SIZE
          by = r * TILE_SIZE
          destroyed = t === TileType.BaseDestroyed
          found = true
          break
        }
      }
    }
    if (!found) return

    const size = TILE_SIZE * 2
    ctx.fillStyle = destroyed ? '#3a3030' : '#2a2418'
    ctx.fillRect(bx, by, size, size)

    if (destroyed) {
      ctx.fillStyle = '#777'
      ctx.fillRect(bx + 10, by + 14, 28, 20)
      ctx.fillStyle = '#c44'
      ctx.font = 'bold 16px monospace'
      ctx.fillText('X', bx + 18, by + 30)
      return
    }

    ctx.fillStyle = '#e8c547'
    ctx.beginPath()
    ctx.moveTo(bx + 24, by + 8)
    ctx.lineTo(bx + 40, by + 28)
    ctx.lineTo(bx + 32, by + 28)
    ctx.lineTo(bx + 32, by + 40)
    ctx.lineTo(bx + 16, by + 40)
    ctx.lineTo(bx + 16, by + 28)
    ctx.lineTo(bx + 8, by + 28)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#c0392b'
    ctx.fillRect(bx + 20, by + 18, 8, 10)
  }

  drawTank(tank: Tank): void {
    if (!tank.alive) return
    const { ctx } = this
    const { x, y, direction, color } = tank
    const s = TANK_SIZE
    const t = now()

    if (tank.isInvincible(t) && Math.floor(t / 100) % 2 === 0) {
      ctx.globalAlpha = 0.45
    }

    ctx.fillStyle = '#2c2c2c'
    if (direction === 'up' || direction === 'down') {
      ctx.fillRect(x, y, 8, s)
      ctx.fillRect(x + s - 8, y, 8, s)
    } else {
      ctx.fillRect(x, y, s, 8)
      ctx.fillRect(x, y + s - 8, s, 8)
    }

    ctx.fillStyle = color
    ctx.fillRect(x + 6, y + 6, s - 12, s - 12)

    ctx.fillStyle = shade(color, -20)
    ctx.fillRect(x + 14, y + 14, s - 28, s - 28)

    ctx.fillStyle = shade(color, -40)
    this.drawBarrel(x, y, direction)

    if (tank.isPlayer) {
      ctx.fillStyle = '#fff6a0'
      ctx.fillRect(x + s / 2 - 2, y + s / 2 - 2, 4, 4)
    }

    ctx.globalAlpha = 1
  }

  private drawBarrel(x: number, y: number, dir: Direction): void {
    const { ctx } = this
    const s = TANK_SIZE
    const cx = x + s / 2
    const cy = y + s / 2
    switch (dir) {
      case 'up':
        ctx.fillRect(cx - 3, y + 2, 6, s / 2)
        break
      case 'down':
        ctx.fillRect(cx - 3, cy, 6, s / 2 - 2)
        break
      case 'left':
        ctx.fillRect(x + 2, cy - 3, s / 2, 6)
        break
      case 'right':
        ctx.fillRect(cx, cy - 3, s / 2 - 2, 6)
        break
    }
  }

  drawBullet(bullet: Bullet): void {
    if (!bullet.alive) return
    const { ctx } = this
    ctx.fillStyle = bullet.ownerIsPlayer ? '#ffe566' : '#ff8a5c'
    ctx.fillRect(bullet.x, bullet.y, BULLET_SIZE, BULLET_SIZE)
    ctx.fillStyle = '#fff'
    ctx.fillRect(bullet.x + 1, bullet.y + 1, 2, 2)
  }

  drawBorder(): void {
    const { ctx } = this
    ctx.strokeStyle = '#4a5a3a'
    ctx.lineWidth = 2
    ctx.strokeRect(1, 1, MAP_WIDTH - 2, MAP_HEIGHT - 2)
  }
}

function shade(hex: string, amount: number): string {
  const n = hex.replace('#', '')
  const num = parseInt(n, 16)
  let r = (num >> 16) + amount
  let g = ((num >> 8) & 0xff) + amount
  let b = (num & 0xff) + amount
  r = Math.max(0, Math.min(255, r))
  g = Math.max(0, Math.min(255, g))
  b = Math.max(0, Math.min(255, b))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
