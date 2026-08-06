import { TileType } from '../types'
import type { Rect } from '../types'
import {
  BASE_TILE,
  MAP_COLS,
  MAP_HEIGHT,
  MAP_ROWS,
  MAP_WIDTH,
  TILE_SIZE,
} from '../constants'
import { levels } from '../map/levels'

export class GameMap {
  /** row-major tiles[row][col] */
  tiles: TileType[][]
  baseAlive = true

  constructor(levelIndex = 0) {
    this.tiles = levels[levelIndex % levels.length].map((row) => [...row])
    this.placeBase()
  }

  private placeBase(): void {
    const { col, row } = BASE_TILE
    // 基地外围砖墙护盾（经典布局）
    const shield: Array<[number, number]> = [
      [col - 1, row - 1],
      [col, row - 1],
      [col + 1, row - 1],
      [col + 2, row - 1],
      [col - 1, row],
      [col + 2, row],
      [col - 1, row + 1],
      [col + 2, row + 1],
    ]
    for (const [c, r] of shield) {
      if (c >= 0 && r >= 0 && c < MAP_COLS && r < MAP_ROWS) {
        if (this.tiles[r][c] !== TileType.Steel) {
          this.tiles[r][c] = TileType.Brick
        }
      }
    }
    for (let r = row; r < row + 2; r++) {
      for (let c = col; c < col + 2; c++) {
        this.tiles[r][c] = TileType.Base
      }
    }
  }

  getTile(col: number, row: number): TileType {
    if (col < 0 || row < 0 || col >= MAP_COLS || row >= MAP_ROWS) {
      return TileType.Steel
    }
    return this.tiles[row][col]
  }

  setTile(col: number, row: number, type: TileType): void {
    if (col < 0 || row < 0 || col >= MAP_COLS || row >= MAP_ROWS) return
    this.tiles[row][col] = type
  }

  isSolid(type: TileType): boolean {
    return (
      type === TileType.Brick ||
      type === TileType.Steel ||
      type === TileType.Base ||
      type === TileType.BaseDestroyed
    )
  }

  /** 矩形是否与固体瓦片碰撞 */
  collidesSolid(rect: Rect): boolean {
    const left = Math.floor(rect.x / TILE_SIZE)
    const right = Math.floor((rect.x + rect.w - 0.01) / TILE_SIZE)
    const top = Math.floor(rect.y / TILE_SIZE)
    const bottom = Math.floor((rect.y + rect.h - 0.01) / TILE_SIZE)

    for (let r = top; r <= bottom; r++) {
      for (let c = left; c <= right; c++) {
        if (this.isSolid(this.getTile(c, r))) return true
      }
    }
    return false
  }

  /** 是否出界 */
  outOfBounds(rect: Rect): boolean {
    return (
      rect.x < 0 ||
      rect.y < 0 ||
      rect.x + rect.w > MAP_WIDTH ||
      rect.y + rect.h > MAP_HEIGHT
    )
  }

  /**
   * 子弹击中瓦片：砖墙摧毁，钢墙挡弹，基地摧毁。
   * 返回是否命中固体。
   */
  hitByBullet(rect: Rect): boolean {
    const left = Math.floor(rect.x / TILE_SIZE)
    const right = Math.floor((rect.x + rect.w - 0.01) / TILE_SIZE)
    const top = Math.floor(rect.y / TILE_SIZE)
    const bottom = Math.floor((rect.y + rect.h - 0.01) / TILE_SIZE)

    let hit = false
    for (let r = top; r <= bottom; r++) {
      for (let c = left; c <= right; c++) {
        const tile = this.getTile(c, r)
        if (tile === TileType.Brick) {
          this.setTile(c, r, TileType.Empty)
          hit = true
        } else if (tile === TileType.Steel) {
          hit = true
        } else if (tile === TileType.Base) {
          this.destroyBase()
          hit = true
        } else if (tile === TileType.BaseDestroyed) {
          hit = true
        }
      }
    }
    return hit
  }

  destroyBase(): void {
    if (!this.baseAlive) return
    this.baseAlive = false
    const { col, row } = BASE_TILE
    for (let r = row; r < row + 2; r++) {
      for (let c = col; c < col + 2; c++) {
        this.setTile(c, r, TileType.BaseDestroyed)
      }
    }
  }
}
