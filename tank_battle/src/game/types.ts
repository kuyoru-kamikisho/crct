/** 方向 */
export type Direction = 'up' | 'down' | 'left' | 'right'

/** 瓦片类型 */
export enum TileType {
  Empty = 0,
  Brick = 1,
  Steel = 2,
  Base = 3,
  BaseDestroyed = 4,
}

/** 游戏状态 */
export type GameStatus = 'ready' | 'playing' | 'paused' | 'won' | 'lost'

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

export interface TankConfig {
  x: number
  y: number
  direction: Direction
  speed: number
  isPlayer: boolean
  color: string
}
